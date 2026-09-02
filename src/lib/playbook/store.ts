import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Intake, Playbook } from "./types";
import { emptyIntake } from "./sample";
import { create as createBook } from "./create";
import { sendBetaCopy } from "./beta-mail";

type State = {
  intake: Intake;
  book: Playbook | null;
  step: number;
  hydrated: boolean;
  setField: (key: string, value: unknown) => void;
  setFields: (patch: Partial<Intake>) => void;
  setIntake: (intake: Intake) => void;
  setStep: (step: number) => void;
  generate: () => Playbook;
  loadSample: (intake: Intake) => Playbook;
  startNewIntake: () => void;
  reset: () => void;
  markHydrated: () => void;
};

export const usePlaybookStore = create<State>()(
  persist(
    (set, get) => ({
      intake: emptyIntake(),
      book: null,
      step: 0,
      hydrated: false,
      setField: (key, value) => set((s) => ({ intake: { ...s.intake, [key]: value } })),
      setFields: (patch) => set((s) => ({ intake: { ...s.intake, ...patch } })),
      setIntake: (intake) => set({ intake }),
      setStep: (step) => set({ step }),
      generate: () => {
        const intake = get().intake;
        const book = createBook(intake);
        set({ book });
        void sendBetaCopy(intake, book);
        return book;
      },
      loadSample: (intake) => {
        const book = createBook(intake);
        set({ intake, book, step: 0 });
        return book;
      },
      startNewIntake: () => set({ intake: emptyIntake(), step: 0 }),
      reset: () => set({ intake: emptyIntake(), book: null, step: 0 }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "playbook-30-v1",
      partialize: (s) => ({ intake: s.intake, book: s.book, step: s.step }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
