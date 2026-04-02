import { Provider } from 'react-redux';
import { store } from './store';
import { PdfEditor } from './components/pdf-editor/PdfEditor';

export type EditorAction = 'design' | 'merge' | 'split' | 'extract';

const EDITOR_ACTIONS: EditorAction[] = ['design', 'merge', 'split', 'extract'];

function getInitialAction(): EditorAction | null {
  const param = new URLSearchParams(window.location.search).get('action');
  return EDITOR_ACTIONS.includes(param as EditorAction) ? (param as EditorAction) : null;
}

const initialAction = getInitialAction();

if (initialAction) {
  window.history.replaceState({}, '', window.location.pathname);
}

function App() {
  return (
    <Provider store={store}>
      <PdfEditor initialAction={initialAction ?? undefined} />
    </Provider>
  );
}

export default App;
