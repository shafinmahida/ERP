import { setDataDirectory } from '../src/db';
import { createCustomer, getCustomerById } from '../src/services/customerService';

const processWithBuiltin = process as typeof process & {
  getBuiltinModule?: (name: string) => unknown;
};
const originalGetBuiltinModule = processWithBuiltin.getBuiltinModule;

processWithBuiltin.getBuiltinModule = (name: string) => {
  if (name === 'node:sqlite') return null;
  return originalGetBuiltinModule ? originalGetBuiltinModule.call(process, name) : null;
};

try {
  setDataDirectory('/tmp/erp-customer-webstore-test');

  const created = createCustomer({
    full_name: 'WebStore Customer Persistence Test',
    father_name: 'WebStore Father',
    date_of_birth: '1999-01-01',
    gender: 'Male',
    nationality: 'Indian',
    mobile_number: '+910000000001',
    passport_number: 'WSPT00001',
    issue_date: '2024-01-01',
    expiry_date: '2034-01-01',
    place_of_issue: 'Mumbai',
  });

  const fetched = getCustomerById(created.customer_id);
  if (!fetched) {
    throw new Error(`FAILED: Could not fetch created customer #${created.customer_id}`);
  }

  if (fetched.full_name !== created.full_name) {
    throw new Error(`FAILED: Expected full_name "${created.full_name}" but got "${fetched.full_name}"`);
  }

  console.log(`PASS: Created customer #${created.customer_id} persisted with full_name "${fetched.full_name}"`);
} finally {
  processWithBuiltin.getBuiltinModule = originalGetBuiltinModule;
}
