import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

export const humanizeMilliseconds = (milliseconds: number): string => {
    try {
        const duration = dayjs.duration(milliseconds)

        if (milliseconds < 1000) {
            return `${milliseconds}ms`
        }

        if (milliseconds < 60000) {
            return `${Math.floor(duration.asSeconds())}s`
        }

        if (milliseconds < 3600000) {
            return `${Math.floor(duration.asMinutes())}m`
        }

        if (milliseconds < 86400000) {
            return `${Math.floor(duration.asHours())}h`
        }

        return `${Math.floor(duration.asDays())}d`
    } catch (e) {
        return `${milliseconds}ms`
    }
}
