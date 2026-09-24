import { describe, expect, it } from "vitest";
import { parseMessageType } from "./prompt";

describe("parseMessageType", () => {
  it("extrae el tipo y deja el cuerpo limpio", () => {
    expect(parseMessageType("TIPO: recomendacion\n\nOBSERVACIÓN: …")).toEqual({
      type: "recomendacion",
      body: "OBSERVACIÓN: …",
    });
  });

  it("tolera tildes y mayúsculas", () => {
    expect(parseMessageType("TIPO: Hipótesis\nTexto").type).toBe("hipotesis");
    expect(parseMessageType("tipo: DECISIÓN\nTexto").type).toBe("decision");
  });

  it("sin línea de tipo, no inventa uno", () => {
    expect(parseMessageType("Hola, ¿en qué te ayudo?")).toEqual({ type: null, body: "Hola, ¿en qué te ayudo?" });
  });

  it("tipo desconocido → null, pero se quita la línea", () => {
    expect(parseMessageType("TIPO: opinion\n\nAlgo")).toEqual({ type: null, body: "Algo" });
  });
});
