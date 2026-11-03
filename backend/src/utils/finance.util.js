export const calculateTotalMeals = (record) => {
  if (!record) return 0;
  const breakfast = Number(record.breakfast) || 0;
  const lunch = Number(record.lunch) || 0;
  const dinner = Number(record.dinner) || 0;
  const guestMeals = Number(record.guestMeals) || 0;
  return breakfast + lunch + dinner + guestMeals;
};

export const normalizeDate = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
