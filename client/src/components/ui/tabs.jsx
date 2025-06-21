import React from "react";
import { cn } from "@/lib/utils";

const Tabs = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  // Register tabs and their content
  const [tabs, setTabs] = React.useState({});

  // Update the active tab when defaultValue changes
  React.useEffect(() => {
    if (defaultValue && defaultValue !== activeTab) {
      setActiveTab(defaultValue);
    }
  }, [defaultValue]);

  const registerTab = (value, content) => {
    setTabs((prev) => ({ ...prev, [value]: content }));
  };

  const contextValue = {
    activeTab,
    setActiveTab,
    registerTab,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("tabs-container", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsContext = React.createContext({
  activeTab: "",
  setActiveTab: () => {},
  registerTab: () => {},
});

const TabsList = ({ children, className }) => {
  return (
    <div
      className={cn("flex space-x-1 rounded-md bg-slate-800/30 p-1", className)}
    >
      {children}
    </div>
  );
};

const TabsTrigger = ({ value, children }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
        activeTab === value
          ? "bg-blue-500/80 text-white shadow-sm"
          : "bg-slate-700/60 text-gray-400 hover:bg-slate-700 hover:text-gray-100"
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, children }) => {
  const { activeTab } = React.useContext(TabsContext);

  if (activeTab !== value) {
    return null;
  }

  return <div className="mt-2 rounded-lg animate-fadeIn">{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
