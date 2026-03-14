import { configureStore } from '@reduxjs/toolkit';
import pdfEditorReducer from './pdf-editor/slice';

export const store = configureStore({
    reducer: {
        pdfEditor: pdfEditorReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
