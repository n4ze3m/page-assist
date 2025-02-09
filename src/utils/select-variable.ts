export const getVariable = (text: string) => {
    const regex = /{([^}]+)}/g;
    let data : {
        word: string,
        start: number,
        end: number
    } | null = null;


    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        data = {
            word: m[1],
            start: m.index,
            end: m.index + m[0].length
        }
    }

    return data;
}