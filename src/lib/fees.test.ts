import { describe, expect, it } from "vitest";
import { calculateDiscountedFee, calculateProratedFee } from "./fees";

describe("calculateDiscountedFee", () => {
  it("sin reglas de descuento devuelve el importe base", () => {
    expect(calculateDiscountedFee(100, {})).toBe(100);
  });

  it("aplica descuento por hermanos (familia con 3 hermanos)", () => {
    // 3 hermanos * 10% = 30% de descuento
    expect(calculateDiscountedFee(100, { siblingCount: 3, siblingDiscountPercent: 10 })).toBe(70);
  });

  it("aplica descuento de familia numerosa", () => {
    expect(calculateDiscountedFee(100, { isLargeFamily: true, largeFamilyDiscountPercent: 20 })).toBe(80);
  });

  it("aplica beca completa (100%) dejando la cuota a 0", () => {
    expect(calculateDiscountedFee(100, { scholarshipDiscountPercent: 100 })).toBe(0);
  });

  it("combina hermanos + familia numerosa + beca parcial de forma secuencial", () => {
    // 100 -> -20% hermanos = 80 -> -10% familia numerosa = 72 -> -50% beca = 36
    const result = calculateDiscountedFee(100, {
      siblingCount: 2,
      siblingDiscountPercent: 10,
      isLargeFamily: true,
      largeFamilyDiscountPercent: 10,
      scholarshipDiscountPercent: 50,
    });
    expect(result).toBe(36);
  });

  it("no deja el descuento superar el 100% aunque las reglas lo sugieran", () => {
    expect(calculateDiscountedFee(100, { siblingCount: 20, siblingDiscountPercent: 10 })).toBe(0);
  });
});

describe("calculateProratedFee", () => {
  const academicYearStart = new Date("2026-09-01");
  const academicYearEnd = new Date("2027-06-30");

  it("alta el primer día de curso cobra el importe completo", () => {
    const result = calculateProratedFee({
      fullYearAmount: 100,
      academicYearStart,
      academicYearEnd,
      enrollmentDate: academicYearStart,
    });
    expect(result).toBe(100);
  });

  it("alta a mitad de curso prorratea aproximadamente a la mitad", () => {
    const midYear = new Date("2027-01-14"); // ~mitad del curso 1-sep a 30-jun
    const result = calculateProratedFee({
      fullYearAmount: 100,
      academicYearStart,
      academicYearEnd,
      enrollmentDate: midYear,
    });
    expect(result).toBeGreaterThan(45);
    expect(result).toBeLessThan(60);
  });

  it("alta anterior al inicio de curso se recorta al importe completo", () => {
    const result = calculateProratedFee({
      fullYearAmount: 100,
      academicYearStart,
      academicYearEnd,
      enrollmentDate: new Date("2026-06-01"),
    });
    expect(result).toBe(100);
  });

  it("alta posterior al fin de curso devuelve 0", () => {
    const result = calculateProratedFee({
      fullYearAmount: 100,
      academicYearStart,
      academicYearEnd,
      enrollmentDate: new Date("2027-07-15"),
    });
    expect(result).toBe(0);
  });
});
