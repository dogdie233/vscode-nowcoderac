import { workspace } from "vscode";

export const getCphSaveLocationPref = (): string | undefined => {
    const pref = workspace.getConfiguration('cph').get<string>('general.saveLocation');
    return pref;
};