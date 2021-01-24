
const unknownFormats: Record<string, boolean> = {
    int32: true,
    int64: true
};

export function stripResponseFormats(schema: Record<string, any>): void {
    for (const item in schema) {
        if (typeof schema[item] === "object") {
            if (schema[item].format && unknownFormats[schema[item].format]) {
                schema[item].format = undefined;
            }

            stripResponseFormats(schema[item]);
        }
    }
}

export const entries = Object.entries as <T>(k: T) => ReadonlyArray<[keyof T, T[keyof T]]>;

export function omit<T, K extends ReadonlyArray<keyof T>, B extends Record<string, unknown>>(src: T, keys?: K, base = {} as B): B & Omit<T, K[number]> {
    if (!keys || keys.length === 0) return { ...base, ...src };
    return entries(src)
        .filter(([k]) => !keys.includes(k))
        .reduce((m, [k, v]) => ({ ...m, [k]: v }), base) as B & Omit<T, K[number]>;
}
