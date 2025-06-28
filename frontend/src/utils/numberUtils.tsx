export const formatNumber = (number: number | null | undefined, decimals = 2): string => {
  if (number === null || number === undefined || isNaN(number)) {
    return (0).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return Number(number).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
