import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// This component is needed because react-beautiful-dnd doesn't work well with React StrictMode
// This wrapper ensures components are only rendered once strict mode checks are complete
export function StrictModeDroppable(props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Using a timeout to ensure this runs after strict mode checks
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props} />;
}

// Export the other components as well for convenience
export { DragDropContext, Draggable };
