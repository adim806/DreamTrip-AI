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
  const location = useLocation();
  const pathname = location.pathname;

  const { isPending, error, data: chats } = useQuery({
    queryKey: ['userChats'],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/userchats`, {
        credentials: "include",
      }).then((res) =>
        res.json(),
      ),
  });

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

            <div className="flex h-full w-full flex-col gap-6 pt-4">
              <div className="flex grow flex-col gap-2 overflow-hidden">
                <div className="flex w-full flex-col gap-1 px-2">
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
                      onClick={() => setShowChats(!showChats)}
                      className={cn(
                        "flex h-10 w-full cursor-pointer flex-row items-center rounded-md px-2 py-2 transition-all hover:bg-primary/10 text-foreground font-medium",
                        pathname.includes("/dashboard/chats") && "bg-primary/15 text-primary font-semibold shadow-sm",
                        isCollapsed ? "justify-center" : "justify-start"
                      )}
                    >
                      <MessagesSquare className="h-5 w-5 min-w-[20px]" />
                      {!isCollapsed && (
                        <div className="ml-3 flex w-full items-center justify-between">
                          <span className="text-sm truncate">Chats</span>
                          <ChevronsUpDown className="h-4 w-4 text-primary/70" />
                        </div>
                      )}
                    </div>
                    
                    {showChats && !isCollapsed && (
                      <div className="ml-6 mt-1.5 flex flex-col gap-1.5 pl-2.5 border-l border-primary/20">
                        {isPending ? (
                          <div className="text-xs text-muted-foreground py-1.5 flex items-center">
                            <div className="w-3 h-3 rounded-full border-2 border-primary/20 border-t-primary animate-spin mr-2"></div>
                            Loading chats...
                          </div>
                        ) : error ? (
                          <div className="text-xs text-destructive py-1.5 flex items-center">
                            <span className="bg-destructive/10 h-5 w-5 rounded-full flex items-center justify-center mr-2">!</span>
                            Error loading chats
                          </div>
                        ) : 
                          chats?.map(chat => (
                            <Link
                              key={chat._id}
                              to={`/dashboard/chats/${chat._id}`}
                              className={cn(
                                "flex h-8 items-center rounded-md px-2.5 text-xs transition-all hover:bg-primary/5 text-muted-foreground",
                                pathname === `/dashboard/chats/${chat._id}` && "bg-primary/10 text-primary font-medium"
                              )}
                            >
                              {chat.title}
                            </Link>
                          ))
                        }
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
              </div>
              
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