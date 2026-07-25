import db from './models/database';

// Seed employees
const employees = [
  { code: 'EMP001', name: 'Carlos Martínez' },
  { code: 'EMP002', name: 'Ana García' },
  { code: 'EMP003', name: 'Pedro López' },
  { code: 'EMP004', name: 'María Rodríguez' },
  { code: 'ADMIN', name: 'Administrador' },
];

// Seed products (typical hotel kitchen ingredients)
const products = [
  { code: 'ARROZ001', name: 'Arroz Blanco 25kg', unit: 'KG', category: 'GRANOS' },
  { code: 'AZUC001', name: 'Azúcar Blanca 50kg', unit: 'KG', category: 'ENDULZANTES' },
  { code: 'ACEI001', name: 'Aceite Vegetal 20L', unit: 'LT', category: 'ACEITES' },
  { code: 'SAL001', name: 'Sal Refinada 25kg', unit: 'KG', category: 'CONDIMENTOS' },
  { code: 'HARINA001', name: 'Harina de Trigo 50kg', unit: 'KG', category: 'HARINAS' },
  { code: 'LECHE001', name: 'Leche Entera 1L', unit: 'LT', category: 'LACTEOS' },
  { code: 'HUEVO001', name: 'Huevo AA x30', unit: 'UND', category: 'PROTEINAS' },
  { code: 'POLLO001', name: 'Pechuga de Pollo', unit: 'KG', category: 'CARNES' },
  { code: 'CARNE001', name: 'Carne Molida', unit: 'KG', category: 'CARNES' },
  { code: 'PAPA001', name: 'Papa Pastusa', unit: 'KG', category: 'TUBERCULOS' },
  { code: 'ZANH001', name: 'Zanahoria', unit: 'KG', category: 'VERDURAS' },
  { code: 'CEBO001', name: 'Cebolla Cabezona', unit: 'KG', category: 'VERDURAS' },
  { code: 'TOMAT001', name: 'Tomate Chonto', unit: 'KG', category: 'VERDURAS' },
  { code: 'FRIJOL001', name: 'Fríjol Cargamanto', unit: 'KG', category: 'GRANOS' },
  { code: 'LENTEJAS001', name: 'Lentejas', unit: 'KG', category: 'GRANOS' },
  { code: 'PANELA001', name: 'Panela Molida', unit: 'KG', category: 'ENDULZANTES' },
  { code: 'CAFE001', name: 'Café Tostado Molido', unit: 'KG', category: 'BEBIDAS' },
  { code: 'PASTA001', name: 'Pasta Espagueti 1kg', unit: 'KG', category: 'PASTAS' },
  { code: 'MANTEQUILLA001', name: 'Mantequilla 500g', unit: 'KG', category: 'LACTEOS' },
  { code: 'QUESO001', name: 'Queso Campesino', unit: 'KG', category: 'LACTEOS' },
];

// Seed ERP data for today and yesterday
const today = new Date().toISOString().substring(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

const erpDataToday = products.map((p, i) => ({
  product_code: p.code,
  product_name: p.name,
  expected_quantity: Math.round((Math.random() * 50 + 5) * 10) / 10,
  unit: p.unit,
  report_date: today
}));

const erpDataYesterday = products.map((p) => ({
  product_code: p.code,
  product_name: p.name,
  expected_quantity: Math.round((Math.random() * 50 + 5) * 10) / 10,
  unit: p.unit,
  report_date: yesterday
}));

// Insert employees
const insertEmployee = db.prepare('INSERT OR IGNORE INTO employees (code, name) VALUES (?, ?)');
for (const emp of employees) {
  insertEmployee.run(emp.code, emp.name);
}
console.log(`✅ Seeded ${employees.length} employees`);

// Insert products
const insertProduct = db.prepare(
  'INSERT OR IGNORE INTO products (code, name, unit, category) VALUES (?, ?, ?, ?)'
);
for (const p of products) {
  insertProduct.run(p.code, p.name, p.unit, p.category);
}
console.log(`✅ Seeded ${products.length} products`);

// Insert ERP data
db.prepare('DELETE FROM erp_data WHERE report_date IN (?, ?)').run(today, yesterday);
const insertErp = db.prepare(
  'INSERT INTO erp_data (product_code, product_name, expected_quantity, unit, report_date) VALUES (?, ?, ?, ?, ?)'
);
for (const e of [...erpDataToday, ...erpDataYesterday]) {
  insertErp.run(e.product_code, e.product_name, e.expected_quantity, e.unit, e.report_date);
}
console.log(`✅ Seeded ${erpDataToday.length + erpDataYesterday.length} ERP records`);

console.log('\n🎉 Database seeded successfully!');
console.log('\nEmployee codes to use:');
employees.forEach(e => console.log(`  ${e.code} - ${e.name}`));
