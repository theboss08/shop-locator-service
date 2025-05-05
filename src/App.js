import './App.css';
import { Amplify } from 'aws-amplify';

import { useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';
import Authentication from './components/Authentication';
import SearchPage from './components/SearchPage';
Amplify.configure(awsExports);

function App() {
  const {authStatus} = useAuthenticator(context => [context.authStatus]);
  return (
    <>
    {authStatus !== 'authenticated' ? <Authentication /> : <SearchPage />}
    </>
  );
}

export default App;
