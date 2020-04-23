
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
