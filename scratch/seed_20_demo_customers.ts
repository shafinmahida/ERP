import { createCustomer, getAllCustomers } from '../src/services/customerService';
import { getRawDb } from '../src/db/index';

console.log('Seeding 20 Realistic Demo Customers into Dayar-E-Habib ERP Database...');

const demoCustomers = [
  { full_name: 'Shafin Suleman Mahida', father_name: 'Suleman Yusuf Mahida', date_of_birth: '2006-04-11', gender: 'Male', nationality: 'Indian', mobile_number: '+917016490230', state: 'Maharashtra', passport_number: 'Q123456', issue_date: '2024-01-10', expiry_date: '2034-01-09', place_of_issue: 'Mumbai' },
  { full_name: 'Rashid Ahmed Khan', father_name: 'Ahmed Noor Khan', date_of_birth: '1985-06-15', gender: 'Male', nationality: 'Indian', mobile_number: '+919820011223', state: 'Maharashtra', passport_number: 'Z9876541', issue_date: '2022-03-01', expiry_date: '2032-02-28', place_of_issue: 'Mumbai' },
  { full_name: 'Fatima Rashid Khan', father_name: 'Rashid Ahmed Khan', date_of_birth: '1990-08-20', gender: 'Female', nationality: 'Indian', mobile_number: '+919820011224', state: 'Maharashtra', passport_number: 'Z9876542', issue_date: '2022-03-01', expiry_date: '2032-02-28', place_of_issue: 'Mumbai' },
  { full_name: 'Yusuf Rashid Khan', father_name: 'Rashid Ahmed Khan', date_of_birth: '2015-11-10', gender: 'Male', nationality: 'Indian', mobile_number: '+919820011223', state: 'Maharashtra', passport_number: 'Z9876543', issue_date: '2023-01-15', expiry_date: '2028-01-14', place_of_issue: 'Mumbai' },
  { full_name: 'Amina Rashid Khan', father_name: 'Rashid Ahmed Khan', date_of_birth: '2018-02-05', gender: 'Female', nationality: 'Indian', mobile_number: '+919820011223', state: 'Maharashtra', passport_number: 'Z9876544', issue_date: '2023-01-15', expiry_date: '2028-01-14', place_of_issue: 'Mumbai' },
  { full_name: 'Zainab Qasim Merchant', father_name: 'Qasim Merchant', date_of_birth: '1988-12-12', gender: 'Female', nationality: 'Indian', mobile_number: '+919666555444', state: 'Gujarat', passport_number: 'P1900001', issue_date: '2021-05-20', expiry_date: '2031-05-19', place_of_issue: 'Ahmedabad' },
  { full_name: 'Ibrahim Qasim Merchant', father_name: 'Qasim Merchant', date_of_birth: '1982-04-18', gender: 'Male', nationality: 'Indian', mobile_number: '+919666555445', state: 'Gujarat', passport_number: 'P1900002', issue_date: '2021-05-20', expiry_date: '2031-05-19', place_of_issue: 'Ahmedabad' },
  { full_name: 'Bilal Suhail Khan', father_name: 'Suhail Khan', date_of_birth: '1992-09-09', gender: 'Male', nationality: 'Indian', mobile_number: '+919811122233', state: 'Delhi', passport_number: 'P1500001', issue_date: '2020-10-10', expiry_date: '2030-10-09', place_of_issue: 'Delhi' },
  { full_name: 'Tariq Mahmood Shaikh', father_name: 'Mahmood Shaikh', date_of_birth: '1979-01-25', gender: 'Male', nationality: 'Indian', mobile_number: '+919700088899', state: 'Karnataka', passport_number: 'K8877112', issue_date: '2019-07-04', expiry_date: '2029-07-03', place_of_issue: 'Bangalore' },
  { full_name: 'Sana Tariq Shaikh', father_name: 'Tariq Mahmood Shaikh', date_of_birth: '1984-03-30', gender: 'Female', nationality: 'Indian', mobile_number: '+919700088899', state: 'Karnataka', passport_number: 'K8877113', issue_date: '2019-07-04', expiry_date: '2029-07-03', place_of_issue: 'Bangalore' },
  { full_name: 'Omar Farooq Al-Siddīqī', father_name: 'Farooq Al-Siddīqī', date_of_birth: '1975-05-05', gender: 'Male', nationality: 'Indian', mobile_number: '+919444455555', state: 'Telangana', passport_number: 'T5544332', issue_date: '2023-08-12', expiry_date: '2033-08-11', place_of_issue: 'Hyderabad' },
  { full_name: 'Khadija Omar Al-Siddīqī', father_name: 'Omar Al-Siddīqī', date_of_birth: '1978-07-14', gender: 'Female', nationality: 'Indian', mobile_number: '+919444455555', state: 'Telangana', passport_number: 'T5544333', issue_date: '2023-08-12', expiry_date: '2033-08-11', place_of_issue: 'Hyderabad' },
  { full_name: 'Usman Ali Ansari', father_name: 'Ali Ansari', date_of_birth: '1995-11-22', gender: 'Male', nationality: 'Indian', mobile_number: '+919111122222', state: 'Uttar Pradesh', passport_number: 'U1122334', issue_date: '2024-02-01', expiry_date: '2034-01-31', place_of_issue: 'Lucknow' },
  { full_name: 'Hafsa Usman Ansari', father_name: 'Usman Ali Ansari', date_of_birth: '1997-02-14', gender: 'Female', nationality: 'Indian', mobile_number: '+919111122222', state: 'Uttar Pradesh', passport_number: 'U1122335', issue_date: '2024-02-01', expiry_date: '2034-01-31', place_of_issue: 'Lucknow' },
  { full_name: 'Hamza Zubair Sayyed', father_name: 'Zubair Sayyed', date_of_birth: '1987-10-10', gender: 'Male', nationality: 'Indian', mobile_number: '+919333344444', state: 'Maharashtra', passport_number: 'M3344556', issue_date: '2021-11-11', expiry_date: '2031-11-10', place_of_issue: 'Pune' },
  { full_name: 'Mariam Hamza Sayyed', father_name: 'Hamza Zubair Sayyed', date_of_birth: '1991-04-04', gender: 'Female', nationality: 'Indian', mobile_number: '+919333344444', state: 'Maharashtra', passport_number: 'M3344557', issue_date: '2021-11-11', expiry_date: '2031-11-10', place_of_issue: 'Pune' },
  { full_name: 'Zayd Hamza Sayyed', father_name: 'Hamza Zubair Sayyed', date_of_birth: '2016-06-06', gender: 'Male', nationality: 'Indian', mobile_number: '+919333344444', state: 'Maharashtra', passport_number: 'M3344558', issue_date: '2022-06-06', expiry_date: '2027-06-05', place_of_issue: 'Pune' },
  { full_name: 'Suhail Akram Choudhury', father_name: 'Akram Choudhury', date_of_birth: '1980-08-08', gender: 'Male', nationality: 'Indian', mobile_number: '+919555566666', state: 'West Bengal', passport_number: 'W5566778', issue_date: '2020-05-05', expiry_date: '2030-05-04', place_of_issue: 'Kolkata' },
  { full_name: 'Nabila Suhail Choudhury', father_name: 'Suhail Choudhury', date_of_birth: '1983-09-09', gender: 'Female', nationality: 'Indian', mobile_number: '+919555566666', state: 'West Bengal', passport_number: 'W5566779', issue_date: '2020-05-05', expiry_date: '2030-05-04', place_of_issue: 'Kolkata' },
  { full_name: 'Zubair Hassan Patel', father_name: 'Hassan Patel', date_of_birth: '1991-01-01', gender: 'Male', nationality: 'Indian', mobile_number: '+919777788888', state: 'Gujarat', passport_number: 'G7788990', issue_date: '2024-03-15', expiry_date: '2034-03-14', place_of_issue: 'Surat' },
];

const existing = getAllCustomers();
console.log(`Current existing customer count: ${existing.length}`);

demoCustomers.forEach((demo, idx) => {
  const found = existing.find((e) => e.mobile_number === demo.mobile_number && e.full_name === demo.full_name);
  if (!found) {
    createCustomer(demo);
    console.log(`+ Seeded Customer #${idx + 1}: ${demo.full_name} (${demo.passport_number})`);
  }
});

const finalCusts = getAllCustomers();
console.log(`✅ Total Customers in Database Now: ${finalCusts.length}`);
