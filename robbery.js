'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = true;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
    let bankTimeZone = getTimeZone(workingHours.from);
    let bankSchedule = timeRangeToMinutes(workingHours, bankTimeZone);

    let allFreeTime = getRobbersFreeTime(schedule, bankTimeZone);
    let bankWorkingTime = getBankWorkingTime(bankSchedule);
    let robberyTime = getRoberyTime(allFreeTime, bankWorkingTime, duration);

    const robberyShift = 30;

    return {
        availableTime: robberyTime,
        currentIndex: 0,

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return robberyTime.length > 0;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this.exists()) {
                return '';
            }

            let dateTime = minutesToDateTime(this.availableTime[this.currentIndex].from);

            return template.replace(/%HH/, dateTime.hours.toString().padStart(2, '0'))
                .replace(/%DD/, dateTime.day)
                .replace(/%MM/, dateTime.minutes.toString().padStart(2, '0'));
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (!this.exists() || this.currentIndex >= this.availableTime.length) {
                return false;
            }

            let current = this.availableTime[this.currentIndex];
            if (current.to - current.from - robberyShift >= duration) {
                current.from += robberyShift;

                return true;
            }

            if (this.currentIndex < this.availableTime.length - 1) {
                this.currentIndex += 1;

                return true;
            }

            return false;
        }
    };
}

const WEEK_DAYS = {
    'ПН': 0,
    'ВТ': 1,
    'СР': 2
};
const MINUTES_TO_HOUR = 60;
const HOURS_IN_DAY = 24;
const MINUTES_IN_DAY = MINUTES_TO_HOUR * HOURS_IN_DAY;

function minutesToDateTime(timeRangeInMinutes) {
    let indexOfDay = Math.floor(timeRangeInMinutes / MINUTES_IN_DAY);
    let [dayName] = Object.keys(WEEK_DAYS)
        .filter(key => WEEK_DAYS[key] === indexOfDay);
    let hours = Math.floor((timeRangeInMinutes - indexOfDay * MINUTES_IN_DAY) / MINUTES_TO_HOUR);
    let minutes = timeRangeInMinutes - indexOfDay * MINUTES_IN_DAY - hours * MINUTES_TO_HOUR;

    return { day: dayName, hours, minutes };
}

function getTimeZone(time) {
    return parseInt(time.substring(time.length - 2));
}

function timeToMinutesFromWeekStart(time, timeZone) {
    let zone = getTimeZone(time);
    let hours = parseInt(time.substr(0, 2));
    let minutes = parseInt(time.substr(3, 2));

    return (hours + timeZone - zone) * MINUTES_TO_HOUR + minutes;
}

function dateTimeToMinutesFromWeekStart(dateTime, timeZone) {
    let parts = dateTime.split(' ');
    let dayIndex = WEEK_DAYS[parts[0]];
    let minutes = timeToMinutesFromWeekStart(parts[1], timeZone);

    return dayIndex * HOURS_IN_DAY * MINUTES_TO_HOUR + minutes;
}

function timeRangeToMinutes(timeRange, timeZone) {
    return {
        from: timeToMinutesFromWeekStart(timeRange.from, timeZone),
        to: timeToMinutesFromWeekStart(timeRange.to, timeZone)
    };
}

function dateTimeRangeToMinutes(dateTimeRange, timeZone) {
    return {
        from: dateTimeToMinutesFromWeekStart(dateTimeRange.from, timeZone),
        to: dateTimeToMinutesFromWeekStart(dateTimeRange.to, timeZone)
    };
}

function getIntervalsIntersection(a, b) {
    let result = [];

    a.forEach(first => {
        b.forEach(second => {
            let intersection = getIntersection(first, second);
            if (intersection.from !== 0 || intersection.to !== 0) {
                result.push(intersection);
            }
        });
    });

    return result;
}

function getRoberyTime(allFreeTime, bankWorkingTime, duration) {
    let robberyTime = [{
        from: 0,
        to: 4 * HOURS_IN_DAY * MINUTES_TO_HOUR
    }];
    robberyTime = allFreeTime
        .concat([bankWorkingTime])
        .reduce(getIntervalsIntersection, robberyTime)
        .filter(timeRange => timeRange.to - timeRange.from >= duration);

    return robberyTime;
}

function getIntersection(a, b) {
    if (Math.min(a.to, b.to) <= Math.max(a.from, b.from)) {
        return { from: 0, to: 0 };
    }

    return {
        from: Math.max(a.from, b.from),
        to: Math.min(a.to, b.to)
    };
}

function getFreeTime(scheduleWhenBusy, bankTimeZone) {
    let points = [0];
    scheduleWhenBusy
        .map(schedule => dateTimeRangeToMinutes(schedule, bankTimeZone))
        .reduce(function (acc, timeRange) {
            acc.push(timeRange.from);
            acc.push(timeRange.to);

            return acc;
        }, points);
    points.push(4 * HOURS_IN_DAY * MINUTES_TO_HOUR);

    points = points.sort((a, b) => a - b);

    let result = [];
    for (let i = 0; i < points.length; i += 2) {
        result.push({
            from: points[i],
            to: points[i + 1]
        });
    }

    return result;
}

function getRobbersFreeTime(schedule, bankTimeZone) {
    let allFreeTime = [];
    Object.keys(schedule)
        .map(key => schedule[key])
        .map(personSchedule => getFreeTime(personSchedule, bankTimeZone))
        .reduce(function (acc, time) {
            acc.push(time);

            return acc;
        }, allFreeTime);

    return allFreeTime;
}

function getBankWorkingTime(bankSchedule) {
    let workingTime = [];
    Object.keys(WEEK_DAYS)
        .map(dayName => WEEK_DAYS[dayName] * HOURS_IN_DAY * MINUTES_TO_HOUR)
        .map(dayInMinutes => (
            {
                from: bankSchedule.from + dayInMinutes,
                to: bankSchedule.to + dayInMinutes
            }
        ))
        .reduce(function (acc, timeRange) {
            acc.push(timeRange);

            return acc;
        }, workingTime);

    return workingTime;
}

module.exports = {
    getAppropriateMoment,

    isStar
};
