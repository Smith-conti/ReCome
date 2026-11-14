import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function source(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../"+path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? require(name), Date, Intl, URLSearchParams });
  return exports;
}
const business = source("src/lib/business/types.ts");
const { parseCatalogFilters: parse, catalogHref } = source("src/lib/offers/catalog-filters.ts", { "../business/types": business });
const format = source("src/lib/format.ts");
const { offerSchema } = source("src/lib/validations/offer.ts", { "@/lib/format": format });
let checks = 0;
function ok(condition, label) { assert.ok(condition,label); console.log(`OK ${++checks}: ${label}`); }
const combined = parse({ q:"pan",tipo:"BAKERY",zona:"Wanchaq",min:"5,50",max:"8",fecha:"2026-11-15",desde:"18:00",hasta:"19:00" });
ok(!combined.errors.length && combined.minPrice===5.5 && combined.maxPrice===8 && combined.businessType==="BAKERY", "Filtros combinados y precio decimal");
ok(Date.parse(combined.pickupFrom)===Date.parse("2026-11-15T23:00:00Z"), "Horario interpretado en Cusco UTC−5");
ok(parse({min:"10",max:"5"}).errors.length>0,"Rango de precios invertido rechazado");
ok(parse({fecha:"2026-02-30"}).errors.length>0,"Fecha inexistente rechazada");
ok(parse({desde:"18:00"}).errors.length>0,"Horario sin fecha rechazado");
ok(parse({fecha:"2026-11-15",desde:"20:00",hasta:"18:00"}).errors.length>0,"Rango horario invertido rechazado");
ok(parse({tipo:"ADMIN",max:"Infinity"}).errors.length===2,"Tipo y precio manipulados rechazados");
const day = parse({fecha:"2026-11-15"});
ok(Date.parse(day.pickupTo)-Date.parse(day.pickupFrom)===86400000,"Fecha sola cubre el día completo de Cusco");
const href = new URL(catalogHref(combined.values,{categoria:"panaderia",pagina:"2"}),"https://example.test");
ok(href.searchParams.get("zona")==="Wanchaq" && href.searchParams.get("max")==="8" && href.searchParams.get("pagina")==="2","Categoría y paginación conservan otros filtros");
const offer = {title:"Pan del día",categoryId:"10000000-0000-4000-8000-000000000001",description:"",originalPrice:"20",discountedPrice:"10",initialQuantity:"5",imageUrl:"",pickupStart:"2026-11-15T18:00",pickupEnd:"2026-11-15T19:00",expirationAt:"2026-11-15T20:00",ingredients:"",allergens:"",storageInstructions:""};
ok(offerSchema.safeParse(offer).success,"Descuento exacto de 50 % permitido");
ok(!offerSchema.safeParse({...offer,discountedPrice:"9.99"}).success,"Descuento mayor que 50 % rechazado");
ok(offerSchema.safeParse({...offer,originalPrice:"19.99"}).success,"Comparación de precios con céntimos");
console.log(`${checks} comprobaciones de catálogo correctas.`);
