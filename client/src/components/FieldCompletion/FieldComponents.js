import CityInput from "./CityInput";
import CountryInput from "./CountryInput";
import BudgetLevelInput from "./BudgetLevelInput";
import DateInput from "./DateInput";
import MissingFieldsForm from "./MissingFieldsForm";
// ניתן להוסיף כאן רכיבים נוספים לכל שדה חסר

export const fieldComponentMap = {
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

export { MissingFieldsForm };
export default fieldComponentMap;
