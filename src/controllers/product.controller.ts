import { Request, Response } from "express";
import { pool } from "../config/connection";
import { Product } from "../models/product";
import fs from "fs";
import path from "path";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price } = req.body as Product;
    const imagem = req.file ? req.file.path.replace("\\", "/") : "";

    const extensionsAccepted = [".jpg", ".jpeg", ".png"];
    const currentExtension = path.extname(imagem);

    if (!extensionsAccepted.includes(currentExtension))
      return res.status(409).json({
        message: "Apenas imagens .png, .jpg ou .jpeg são aceitas!",
      });

    if (!name || !description || !price) {
      return res
        .status(400)
        .json({ message: "Todos os campos nao foram preenchidos" });
    }

    const query =
      "INSERT INTO produtos (nome, descricao, preco, imagem) VALUES ($1, $2, $3, $4) RETURNING *";
    const values = [name, description, price, imagem];
    const result = await pool.query(query, values);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM produtos p ORDER BY p.id_produto"
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM produtos where id_produto = $1",
      [id]
    );

    if (!result) {
      return res.status(404).json({ message: "Produto nao encontrado" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao obter produto", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body as Product;

    const query =
      "UPDATE produtos SET nome = $1, descricao = $2, preco = $3 WHERE id_produto = $4 RETURNING *";
    const values = [name, description, price, id];

    const result = await pool.query(query, values);

    if (!result) {
      return res.status(404).json({ message: "Produto nao encontrado" });
    }

    return res.status(200).json({ message: "Produto atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar produto", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM produtos WHERE id_produto = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const product = result.rows[0];

    if (product.imagem) {
      fs.unlinkSync(path.join(__dirname, "..", "..", product.imagem));
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const downloadImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = "SELECT imagem FROM produtos WHERE id_produto = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0 || !result.rows[0].imagem) {
      return res.status(404).json({ message: "Erro, imagem não encontrada" });
    }
    const imagem = result.rows[0].imagem;

    const imagePath = path.join(__dirname, "..", imagem);
    return res.status(200).download(imagePath);
  } catch (error) {
    console.error("Erro ao carregar arquivo", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
