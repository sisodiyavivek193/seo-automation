function getWeeklyReportPeriod() {

    const today = new Date();
    const day = today.getDay();
    const diff = day === 6 ? 5 : day - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    return { startDate: monday, endDate: friday };
}

function getMonthlyReportPeriod() {

    const today = new Date();

    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
}

module.exports = {
    getWeeklyReportPeriod,
    getMonthlyReportPeriod
};