// dateUtils.js — IST fix
function isSaturday() {
    const now = new Date();
    // IST = UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.getDay() === 6;
}

function isThirdDayOfMonth() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.getDate() === 3;
}
module.exports = {
    isSaturday,
    isThirdDayOfMonth
};