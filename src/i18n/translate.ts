import type { Messages } from "./messages/en";

export type TranslationValues = Record<string, string | number>;

type Join<K, P> = K extends string
    ? P extends string
        ? `${K}.${P}`
        : never
    : never;

type LeafKeys<T> = T extends string
    ? never
    : {
          [K in keyof T & string]: T[K] extends string
              ? K
              : T[K] extends Record<string, unknown>
                ? Join<K, LeafKeys<T[K]>>
                : never;
      }[keyof T & string];

export type TranslationKey = LeafKeys<Messages>;

function getValueByKey(messages: Messages, key: string): unknown {
    return key.split(".").reduce<unknown>((acc, part) => {
        if (acc && typeof acc === "object" && part in acc) {
            return (acc as Record<string, unknown>)[part];
        }
        return undefined;
    }, messages);
}

export function translate(
    messages: Messages,
    key: TranslationKey,
    values?: TranslationValues,
): string {
    const raw = getValueByKey(messages, key);

    if (typeof raw !== "string") {
        return key;
    }

    if (!values) {
        return raw;
    }

    return raw.replace(/\{(\w+)\}/g, (_, token: string) => {
        const value = values[token];
        return value == null ? `{${token}}` : String(value);
    });
}
