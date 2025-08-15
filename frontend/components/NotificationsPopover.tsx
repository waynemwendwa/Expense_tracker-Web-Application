'use client'

import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/Button';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';


export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data: any; // Can be more specific if you know the data shape
  created_at: string;
}



const NotificationItem = ({ notification, onRead }: { notification: Notification, onRead: (id: string) => void }) => {
    const handleItemClick = async () => {
        if (!notification.is_read) {
            try {
                await apiService.markNotificationAsRead(notification.id);
                onRead(notification.id); // Update the parent's state
            } catch (error) {
                toast.error("Failed to mark as read.");
            }
        }
        // Optional: you could add navigation here based on notification.type or notification.data
    };

    return (
        <div 
            onClick={handleItemClick}
            className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${!notification.is_read ? 'bg-primary-50' : ''}`}
        >
            <p className="font-semibold text-sm">{notification.title}</p>
            <p className="text-sm text-gray-600">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
        </div>
    );
};


export const NotificationsPopover = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = async () => {
        if (!isOpen) return; // Only fetch when the popover is opened
        setIsLoading(true);
        try {
            const res = await apiService.getNotifications({ limit: 7 }); // Get latest 7
            setNotifications(res.data.notifications);
        } catch (error) {
            toast.error("Could not load notifications.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchUnreadCount = async () => {
        try {
            const res = await apiService.getUnreadNotificationCount();
            setUnreadCount(res.data.count);
        } catch (error) {
            // Fail silently
            console.error("Could not fetch unread count", error);
        }
    }

    useEffect(() => {
        fetchUnreadCount(); // Fetch count on initial load
        fetchNotifications(); // Fetch notifications when popover is opened
    }, [isOpen]);

    const handleMarkOneAsRead = (id: string) => {
        // Optimistically update the UI
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiService.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({...n, is_read: true})));
            setUnreadCount(0);
            toast.success("All notifications marked as read.");
        } catch (error) {
            toast.error("Failed to mark all as read.");
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b flex justify-between items-center">
                    <h4 className="font-medium">Notifications</h4>
                    {notifications.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
                        </Button>
                    )}
                </div>
                <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                    {isLoading ? (
                        <p className="text-center p-4 text-sm text-gray-500">Loading...</p>
                    ) : notifications.length > 0 ? (
                        notifications.map(n => <NotificationItem key={n.id} notification={n} onRead={handleMarkOneAsRead} />)
                    ) : (
                        <p className="text-center p-4 text-sm text-gray-500">No new notifications.</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}