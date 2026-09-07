const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const FILE_MAP = {
  services: path.join(DATA_DIR, 'services.json'),
  integrations: path.join(DATA_DIR, 'integrations.json'),
  tests: path.join(DATA_DIR, 'tests.json'),
  defects: path.join(DATA_DIR, 'defects.json')
};

async function ensureDataFile(fileKey) {
  const filePath = FILE_MAP[fileKey];
  if (!filePath) {
    throw new Error(`Unknown data entity: ${fileKey}`);
  }
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(filePath, '[]', 'utf8');
  }
  return filePath;
}

async function readAll(fileKey) {
  const filePath = await ensureDataFile(fileKey);
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error parsing JSON from ${filePath}:`, err);
    return [];
  }
}

async function writeAll(fileKey, data) {
  const filePath = await ensureDataFile(fileKey);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

async function getById(fileKey, id) {
  const items = await readAll(fileKey);
  return items.find(item => String(item.id).toLowerCase() === String(id).toLowerCase()) || null;
}

async function create(fileKey, item) {
  const items = await readAll(fileKey);
  const existing = items.find(i => String(i.id).toLowerCase() === String(item.id).toLowerCase());
  if (existing) {
    const error = new Error(`Record with ID '${item.id}' already exists.`);
    error.statusCode = 400;
    throw error;
  }
  items.push(item);
  await writeAll(fileKey, items);
  return item;
}

async function update(fileKey, id, updatedFields) {
  const items = await readAll(fileKey);
  const index = items.findIndex(item => String(item.id).toLowerCase() === String(id).toLowerCase());
  if (index === -1) {
    const error = new Error(`Record with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }
  // Preserve original ID unless specifically permitted, but update all other fields
  const updatedItem = { ...items[index], ...updatedFields, id: items[index].id };
  items[index] = updatedItem;
  await writeAll(fileKey, items);
  return updatedItem;
}

async function remove(fileKey, id) {
  const items = await readAll(fileKey);
  const index = items.findIndex(item => String(item.id).toLowerCase() === String(id).toLowerCase());
  if (index === -1) {
    const error = new Error(`Record with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }
  const deletedItem = items.splice(index, 1)[0];
  await writeAll(fileKey, items);
  return deletedItem;
}

module.exports = {
  readAll,
  writeAll,
  getById,
  create,
  update,
  remove
};
