import { Provider } from 'react-redux'
import { store } from './store'
import { PdfEditor } from './components/pdf-editor/PdfEditor'

function App() {

  return (
    <Provider store={store}>
      <PdfEditor />
    </Provider>
  )
}

export default App
