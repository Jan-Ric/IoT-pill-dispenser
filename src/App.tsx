import { useState } from "react";
import Alert from "./components/Alert";
import Button from "./components/Button";

function App() {
  const [alertVisible, setAlertVisible] = useState(false);

  return (
    <div>
      {alertVisible && (
        <Alert onClose={() => setAlertVisible(false)}>
          This is an important alert message!
        </Alert>
      )}
      <Button color="dark" onClick={() => setAlertVisible(true)}>
        Click <span>Me</span>
      </Button>
    </div>
  );
}

export default App;
