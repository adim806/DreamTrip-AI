"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ChevronsUpDown,
  FileClock,
  GraduationCap,
  Layout,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MessagesSquare,
  Plus,
  Settings,
  UserCircle,
  UserCog,
  UserSearch,
  PlusCircle,
  MapPin,
  Globe,
  Info,
  Pencil,
  Trash2,
  MoreVertical,
  Check,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "55px",
  },
};

const contentVariants = {
  open: { opacity: 1 },
  closed: { opacity: 1 },
};

const iconVariants = {
  open: { opacity: 1 },
  closed: { opacity: 1 }
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

export function SidebarNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showChats, setShowChats] = useState(false);
  const [chatFilter, setChatFilter] = useState("");
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatTitle, setEditingChatTitle] = useState("");
  const [showOptionsForChat, setShowOptionsForChat] = useState(null);
  const location = useLocation();
  const pathname = location.pathname;
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();

  const fetchChats = async () => {
    console.log("Fetching user chats, userId:", userId);
    
    if (!isSignedIn && !import.meta.env.DEV) {
      console.log("User not signed in, aborting fetch");
      return [];
    }

    try {
      const headers = isSignedIn 
        ? { 'Authorization': `Bearer ${await getToken()}` }
        : {};
        
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/userchats?userId=${userId}`, {
        method: 'GET',
        credentials: "include",
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully loaded ${data.length} chats`);
      return data;
    } catch (error) {
      console.error("Error fetching chats:", error);
      throw error;
    }
  };

  const { isPending, error, data: chats, refetch } = useQuery({
    queryKey: ['userChats', userId],
    queryFn: fetchChats,
    enabled: isLoaded && (isSignedIn || import.meta.env.DEV) && !!userId,
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if ((isLoaded && isSignedIn && userId) || import.meta.env.DEV) {
      console.log("Auth state ready, refreshing chats");
      refetch();
    }
  }, [isLoaded, isSignedIn, userId, refetch]);

  const handleToggleChats = () => {
    if (!showChats && ((isLoaded && isSignedIn && userId) || import.meta.env.DEV)) {
      refetch();
    }
    setShowChats(!showChats);
  };

  const filteredChats = chats?.filter(chat => {
    return chat.title.toLowerCase().includes(chatFilter.toLowerCase());
  }) || [];

  const toggleChatOptions = (chatId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowOptionsForChat(showOptionsForChat === chatId ? null : chatId);
  };

  const handleEditChat = (chatId, currentTitle, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingChatTitle(currentTitle);
    setShowOptionsForChat(null);
  };

  const handleSaveEdit = async (chatId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editingChatTitle.trim() === "") return;
    
    try {
      const headers = isSignedIn 
        ? { 'Authorization': `Bearer ${await getToken()}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
        
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/userchats/${chatId}?userId=${userId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ title: editingChatTitle }),
      });
      
      if (response.ok) {
        refetch();
        setEditingChatId(null);
      } else {
        console.error('Failed to update chat title');
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('האם אתה בטוח שברצונך למחוק את השיחה הזו?')) return;
    
    try {
      const headers = isSignedIn 
        ? { 'Authorization': `Bearer ${await getToken()}` }
        : {};
        
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/userchats/${chatId}?userId=${userId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (response.ok) {
        refetch();
      } else {
        console.error('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleCancelEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(null);
  };

  return (
    <motion.div
      className="sidebar fixed left-0 z-40 h-full shrink-0 border-r border-border/40 fixed bg-card shadow-lg"
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="relative z-40 flex text-foreground h-full shrink-0 flex-col bg-gradient-to-b from-card to-card/95 dark:bg-card transition-all">
        <div className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            <div className="flex h-[60px] w-full shrink-0 border-b border-border/40 p-2">
              <div className="mt-[1.5px] flex w-full items-center justify-center">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full flex justify-center" asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex items-center gap-2 px-2 text-foreground hover:bg-secondary/80",
                        isCollapsed ? "justify-center" : "justify-start w-full"
                      )}
                    >
                      <Avatar className="rounded size-8 bg-primary shadow-md">
                        <AvatarFallback className="text-primary-foreground font-medium">D</AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {"DreamTrip AI"}
                          </p>
                          <ChevronsUpDown className="h-4 w-4 text-primary/70" />
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="border-border/40 bg-card">
                    <DropdownMenuItem
                      asChild
                      className="flex items-center gap-2 focus:bg-primary/10"
                    >
                      <Link to="/settings">
                        <UserCog className="h-4 w-4 text-primary" /> Account settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/40" />
                    <DropdownMenuItem
                      className="flex items-center gap-2 focus:bg-primary/10"
                    >
                      <LogOut className="h-4 w-4 text-primary" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex h-full w-full flex-col pt-4">
              <ScrollArea className="flex-grow px-2">
                <div className="flex w-full flex-col gap-1">
                  <Link
                    to="/dashboard"
                    className={cn(
                      "flex h-10 w-full flex-row items-center rounded-md px-2 py-2 transition-all hover:bg-primary/10 text-foreground font-medium",
                      pathname === "/dashboard" && "bg-primary/15 text-primary font-semibold shadow-sm",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    <PlusCircle className={cn("h-5 w-5 min-w-[20px]", !isCollapsed && "text-blue-500")} />
                    {!isCollapsed && (
                      <span className="ml-3 text-sm truncate text-blue-500 font-medium">New Chat</span>
                    )}
                  </Link>
                  
                  <div className="relative">
                    <div
                      onClick={handleToggleChats}
                      className={cn(
                        "flex h-10 w-full cursor-pointer flex-row items-center rounded-md px-2 py-2 transition-all hover:bg-primary/10 text-foreground font-medium",
                        pathname.includes("/dashboard/chats") && "bg-primary/15 text-primary font-semibold shadow-sm",
                        isCollapsed ? "justify-center" : "justify-start"
                      )}
                    >
                      <MessagesSquare className="h-5 w-5 min-w-[20px]" />
                      {!isCollapsed && (
                        <div className="ml-3 flex w-full items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm truncate">Chats</span>
                            {(chats?.length > 0) && (
                              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium text-primary">
                                {chats?.length}
                              </span>
                            )}
                          </div>
                          <ChevronsUpDown className="h-4 w-5 text-primary/70" />
                        </div>
                      )}
                    </div>
                    
                    {showChats && !isCollapsed && (
                      <div className="mt-1 flex flex-col border-primary/5 bg-secondary/20 rounded-md shadow-inner max-h-[50vh] overflow-hidden mx-auto w-[13rem] max-w-[13rem]">
                        <div className="px-2 pt-2 pb-2 w-full">
                          <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-muted-foreground">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              placeholder="Search chat titles..."
                              value={chatFilter}
                              onChange={(e) => setChatFilter(e.target.value)}
                              className="w-full rounded-md bg-background/90 py-1 pl-6 pr-2 text-xs outline-none border border-primary/10 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pr-1 mt-1 pb-1 w-full">
                          {isPending ? (
                            <div className="text-xs text-muted-foreground py-3 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full border-2 border-primary/20 border-t-primary animate-spin mr-1"></div>
                              Loading...
                            </div>
                          ) : error ? (
                            <div className="text-xs text-destructive py-3 flex items-center justify-center">
                              <span className="bg-destructive/10 h-4 w-4 rounded-full flex items-center justify-center mr-1">!</span>
                              Error
                            </div>
                          ) : filteredChats?.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-4 flex flex-col items-center justify-center space-y-1">
                              <MessagesSquare className="h-4 w-4 text-primary/30" />
                              {chatFilter ? "No matches" : "No chats"}
                            </div>
                          ) : 
                            filteredChats?.map(chat => (
                              <div key={chat._id} className="relative mb-1">
                                {editingChatId === chat._id ? (
                                  <form 
                                    onSubmit={(e) => handleSaveEdit(chat._id, e)} 
                                    className="flex items-center mx-1 px-2 py-2 rounded-md bg-primary/5 shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={editingChatTitle}
                                      onChange={(e) => setEditingChatTitle(e.target.value)}
                                      className="flex-grow bg-transparent text-xs outline-none border-b border-primary/30 px-0.5 py-1 min-w-0"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button 
                                      type="button" 
                                      onClick={handleCancelEdit}
                                      className="p-1 ml-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0"
                                    >
                                      <X size={12} />
                                    </button>
                                    <button 
                                      type="submit" 
                                      className="p-1 ml-1 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-full flex-shrink-0"
                                    >
                                      <Check size={12} />
                                    </button>
                                  </form>
                                ) : (
                                  <div className="mx-1 rounded-md overflow-hidden hover:bg-primary/5">
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center w-full justify-between">
                                        <Link
                                          to={`/dashboard/chats/${chat._id}`}
                                          className={cn(
                                            "flex items-center w-full px-2 py-1.5 text-xs transition-all text-foreground",
                                            pathname === `/dashboard/chats/${chat._id}` 
                                              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                                              : "border-l-2 border-transparent"
                                          )}
                                        >
                                          <div 
                                            className="w-[calc(100%-22px)] truncate" 
                                            title={chat.title.length > 25 ? chat.title : ""}
                                          >
                                            {chat.title.length > 25 ? `${chat.title.substring(0, 22)}...` : chat.title}
                                          </div>
                                        </Link>
                                        <button 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowOptionsForChat(showOptionsForChat === chat._id ? null : chat._id);
                                          }}
                                          className={cn(
                                            "p-1 mr-1 text-muted-foreground hover:text-primary rounded-full hover:bg-primary/10 flex-shrink-0",
                                            showOptionsForChat === chat._id && "text-primary bg-primary/10"
                                          )}
                                        >
                                          <Settings size={11} />
                                        </button>
                                      </div>
                                      
                                      {showOptionsForChat === chat._id && (
                                        <div className="flex w-full border-t border-border/10 px-2 py-1 bg-secondary/30">
                                          <button 
                                            onClick={(e) => handleEditChat(chat._id, chat.title, e)}
                                            className="flex items-center text-[10px] text-muted-foreground hover:text-primary mr-2"
                                          >
                                            <Pencil size={10} className="mr-1" />
                                            Edit
                                          </button>
                                          <button 
                                            onClick={(e) => handleDeleteChat(chat._id, e)}
                                            className="flex items-center text-[10px] text-muted-foreground hover:text-destructive"
                                          >
                                            <Trash2 size={10} className="mr-1" />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Link
                    to="/explore"
                    className={cn(
                      "flex h-10 w-full flex-row items-center rounded-md px-2 py-2 transition-all hover:bg-primary/10 text-foreground font-medium",
                      pathname.includes("/explore") && "bg-primary/15 text-primary font-semibold shadow-sm",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    <Globe className="h-5 w-5 min-w-[20px]" />
                    {!isCollapsed && (
                      <span className="ml-3 text-sm truncate">Explore</span>
                    )}
                  </Link>
                  
                  <Link
                    to="/mytrips"
                    className={cn(
                      "flex h-10 w-full flex-row items-center rounded-md px-2 py-2 transition-all hover:bg-primary/10 text-foreground font-medium",
                      pathname.includes("/mytrips") && "bg-primary/15 text-primary font-semibold shadow-sm",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    <MapPin className="h-5 w-5 min-w-[20px]" />
                    {!isCollapsed && (
                      <span className="ml-3 text-sm truncate">My Trips</span>
                    )}
                  </Link>
                  
                  <Link
                    to="/about"
                    className={cn(
                      "flex h-10 w-full flex-row items-center rounded-md px-2 py-2 transition-all hover:bg-primary/10 text-foreground font-medium",
                      pathname.includes("/about") && "bg-primary/15 text-primary font-semibold shadow-sm",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    <Info className="h-5 w-5 min-w-[20px]" />
                    {!isCollapsed && (
                      <span className="ml-3 text-sm truncate">About</span>
                    )}
                  </Link>
                </div>
              </ScrollArea>
              
              <div className="mt-auto p-3 flex items-center justify-center">
                {!isCollapsed ? (
                  <div className="flex items-center gap-3 rounded-md border-primary/30 border bg-primary/10 p-3 shadow-inner w-full">
                    <img src="/logo.png" alt="DreamTrip AI" className="h-9 w-9 rounded-full shadow-md" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-primary">Upgrade to PRO</span>
                      <span className="text-xs text-muted-foreground">Get unlimited access</span>
                    </div>
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 rounded-full bg-primary/20 shadow-md">
                    <AvatarFallback className="text-primary text-xs font-bold">PRO</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 