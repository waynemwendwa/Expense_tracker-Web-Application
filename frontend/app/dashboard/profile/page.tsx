'use client'

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'react-hot-toast';
import { apiService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Router } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

const UpdateProfileForm = () => {
    const { user, loading, fetchUserProfile } = useAuth(); 
    const [formData, setFormData] = React.useState({
        firstName: '',
        lastName: '',
        email: '',
        preferredCurrency: 'USD'
    });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                preferredCurrency: user.preferredCurrency,

            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiService.updateProfile(formData);
            toast.success('Profile updated successfully!');
            if (fetchUserProfile) await fetchUserProfile(); 
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update profile.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !user) return <div>Loading profile...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input name="firstName" value={formData.firstName} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input name="lastName" value={formData.lastName} onChange={handleChange} />
                </div>
            </div>
            <div>
                <Label htmlFor="email">Email Address</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
        </form>
    );
};

const ChangePasswordForm = () => {
    const [formData, setFormData] = React.useState({ currentPassword: '', newPassword: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiService.changePassword(formData);
            toast.success('Password changed successfully!');
            setFormData({ currentPassword: '', newPassword: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to change password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input name="currentPassword" type="password" value={formData.currentPassword} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} required />
            </div>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Change Password'}
            </Button>
        </form>
    );
};

export default function ProfilePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
                    <p className="text-gray-600 mt-1">Manage your personal information and security settings.</p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Personal Information</h3>
                    </div>
                    <div className="p-6">
                        <UpdateProfileForm />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Change Password</h3>
                    </div>
                    <div className="p-6">
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </div>
    );
}