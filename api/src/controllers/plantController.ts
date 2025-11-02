import { Request, Response } from "express";
import { Plant } from "../models/Plant";

export const addPlant = async (req: Request, res: Response) => {
  try {
    const { plant, sensors } = req.body;

    if (!plant || !plant.name) {
      return res.status(400).json({ error: "El nombre de la planta es obligatorio" });
    }

    const newPlant = new Plant({
      name: plant.name,
      type: plant.type || undefined,
      sensors: sensors || [],
    });

    await newPlant.save();

    return res.status(201).json({ message: "Planta creada correctamente", plant: newPlant });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error creando la planta" });
  }
};
