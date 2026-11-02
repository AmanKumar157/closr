import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      await login(data);
      toast.success('Welcome back to closr!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon={Lock}
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required'
          })}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={submitting}
        className="w-full"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Sign In
      </Button>

      <div className="text-center pt-2">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;

