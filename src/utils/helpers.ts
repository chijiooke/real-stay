export const generateOtp = (length: number = 6): string => {
  const min = Math.pow(10, length - 1); // Smallest number with given length
  const max = Math.pow(10, length) - 1; // Largest number with given length
  return Math.floor(min + Math.random() * (max - min)).toString();
};
