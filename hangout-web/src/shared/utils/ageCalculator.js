/**
 * Calculate age from a birthdate string or Date object
 * @param {string | Date} birthDate - Birth date in 'YYYY-MM-DD' format or as Date object
 * @returns {number} Age in years, or null if date is invalid
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;

  try {
    // Parse the date if it's a string
    const birth = typeof birthDate === 'string' 
      ? new Date(birthDate) 
      : new Date(birthDate);

    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    
    // Adjust if birthday hasn't occurred yet this year
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age > 0 ? age : null;
  } catch (err) {
    console.error('Error calculating age:', err);
    return null;
  }
}
