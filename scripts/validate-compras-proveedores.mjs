import { validateComprasTxt } from './compras-txt-api.mjs';

try {
  const result = await validateComprasTxt();
  console.log(
    `Compras TXT válido: ${result.proveedores} proveedores, `
    + `${result.productos} productos y ${result.relaciones} relaciones.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
