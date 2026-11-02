import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export const RegisterForm = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password
      });
      toast.success('Account created successfully! Welcome aboard.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name"
        type="text"
        placeholder="Alex Morgan"
        icon={User}
        autoComplete="name"
        error={errors.name?.message}
        {...register('name', {
          required: 'Full name is required',
          minLength: {
            value: 2,
            message: 'Name must be at least 2 characters'
          }
        })}
      />

      <Input
        label="Email Address"
        type="email"
        placeholder="alex@example.com"
        icon={Mail}
        autoComplete="email"
        error={errors.email?.message}
        {...register('email', {
          required: 'Email address is required',
          pattern: {
            value: /^\S+@\S+\.\S+$/,
            message: 'Please enter a valid email address'
          }
        })}
      />

      <div className="relative">
        <Input
          label="Password"
          allowClear={false}
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 6 characters"
          icon={Lock}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters'
            }
          })}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <Input
        label="Confirm Password"
        allowClear={false}
        type={showPassword ? 'text' : 'password'}
        placeholder="Re-enter your password"
        icon={Lock}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: (val) => val === password || 'Passwords do not match'
        })}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={submitting}
        className="w-full mt-2"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Create Free Account
      </Button>

      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;

