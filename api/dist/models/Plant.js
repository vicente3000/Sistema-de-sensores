import mongoose, { Schema } from "mongoose";
const plantSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String },
}, { timestamps: true });
export const Plant = mongoose.model("Plant", plantSchema);
