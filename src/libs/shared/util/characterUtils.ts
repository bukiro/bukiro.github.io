export const spellLevelFromCharLevel = (charLevel: number): number => {
    const half = .5;

    return Math.ceil(charLevel * half);
};
