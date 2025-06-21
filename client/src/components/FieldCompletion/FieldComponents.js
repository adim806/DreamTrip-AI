import CityInput from "./CityInput";
import CountryInput from "./CountryInput";
import BudgetLevelInput from "./BudgetLevelInput";
import DateInput from "./DateInput";
// ניתן להוסיף כאן רכיבים נוספים לכל שדה חסר

const fieldComponentMap = {
  city: CityInput,
  country: CountryInput,
  budget_level: BudgetLevelInput,
  budget: BudgetLevelInput,
  date: DateInput,
  dates: DateInput,
  checkIn: DateInput,
  checkOut: DateInput,
  time: DateInput,
  // ...המשך שדות
};

// Export both as default and named export to support both import styles
export default fieldComponentMap;
export { fieldComponentMap };
