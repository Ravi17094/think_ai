import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  fetchPreferences,
  updatePreferences,
  showToast,
  notificationReceived
} from '../../features/preferenceNotification/preferenceNotificationSlice';
import { selectUser } from '../../features/auth/authSlice';

export default function NotificationPreferencesPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const { preferences } = useSelector((state) => state.notifications);

  const userId = user?.id || 1;
  const pendingCourse = location.state?.pendingCartCourse;
  
  // Track if item has been added to cart from this page
  const [addedToCart, setAddedToCart] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    dispatch(fetchPreferences(userId));
  }, [dispatch, userId]);

  const defaultCategories = {
    courseUpdates: true,
    paymentAlerts: true,
    forumReplies: true,
    systemAnnouncements: true,
  };

  const currentCategories = preferences?.categories && Object.keys(preferences.categories).length > 0
    ? preferences.categories
    : defaultCategories;

  const handleToggle = (key, isCategory = false, categoryKey = null) => {
    if (!preferences) return;

    let updates = {};
    if (isCategory) {
      updates = {
        categories: {
          ...currentCategories,
          [categoryKey]: !currentCategories[categoryKey],
        }
      };
    } else {
      updates = { [key]: !preferences[key] };
    }

    dispatch(updatePreferences({ userId, updates }))
      .unwrap()
      .then(() => {
        dispatch(showToast({
          title: 'Preferences Updated',
          message: 'Your notification settings have been saved.',
          type: 'success'
        }));
      })
      .catch(() => {
        dispatch(showToast({
          title: 'Error',
          message: 'Failed to update preferences on server.',
          type: 'error'
        }));
      });
  };

  // Explicit action when user clicks "Add to Cart" on the preferences page
  const handleConfirmAddToCart = () => {
    if (!pendingCourse) return;

    dispatch(notificationReceived({
      id: `cart_${Date.now()}`,
      title: 'Added to Cart',
      message: `${pendingCourse.title} has been added to your shopping cart.`,
      type: 'cart',
      read: false,
      createdAt: new Date().toISOString(),
    }));

    dispatch(showToast({
      title: 'Success!',
      message: `${pendingCourse.title} has been successfully added to your cart.`,
      type: 'success'
    }));

    setAddedToCart(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Real Course Details Card with Add to Cart Button */}
      {pendingCourse && (
        <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 items-center backdrop-blur-md">
          
          {/* Thumbnail Container with object-contain to make the logo fully visible */}
          <div className="w-full md:w-1/3 h-36 bg-slate-950/80 rounded-xl flex items-center justify-center p-2 shadow-inner overflow-hidden border border-slate-800">
            {pendingCourse.thumbnail || pendingCourse.image ? (
              <img 
                src={pendingCourse.thumbnail || pendingCourse.image} 
                alt={pendingCourse.title} 
                className="w-full h-full object-contain drop-shadow" 
              />
            ) : (
              <span className="text-xl font-bold text-white">{pendingCourse.title.slice(0, 3).toUpperCase()}</span>
            )}
          </div>
          
          <div className="flex-1 space-y-3 w-full">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              PENDING CART ITEM
            </span>
            <h2 className="text-xl font-bold text-white">{pendingCourse.title}</h2>
            <p className="text-xs text-slate-300 line-clamp-2">{pendingCourse.description || "No description provided."}</p>
            
            <div className="flex flex-wrap gap-4 items-center justify-between pt-2">
              <span className="text-lg font-extrabold text-purple-400">
                {typeof pendingCourse.price === 'number' ? `₹${pendingCourse.price}` : (pendingCourse.price || 'Free')}
              </span>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmAddToCart}
                  disabled={addedToCart}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg cursor-pointer ${
                    addedToCart 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 cursor-default' 
                      : 'bg-yellow-400 hover:bg-yellow-300 text-slate-900 shadow-yellow-400/10'
                  }`}
                >
                  {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                </button>

                {addedToCart && (
                  <button
                    onClick={() => navigate(`/learner/courses/${pendingCourse.id || pendingCourse._id}/checkout`)}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-sm transition-all cursor-pointer"
                  >
                    Proceed to Checkout &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences Section */}
      <div id="preferences-panel" className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Notification Preferences</h1>
          <p className="text-sm text-slate-400 mt-1">Control how and when you receive alerts from Thinkz.ai.</p>
        </div>

        {/* Channels */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">Notification Channels</h3>
          {['emailEnabled', 'smsEnabled', 'pushEnabled'].map((channel) => (
            <label key={channel} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer">
              <span className="text-sm text-slate-200 capitalize">{channel.replace('Enabled', '')} Notifications</span>
              <input
                type="checkbox"
                checked={!!preferences?.[channel]}
                onChange={() => handleToggle(channel)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </label>
          ))}
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">Categories</h3>
          {Object.keys(currentCategories).map((catKey) => (
            <label key={catKey} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer">
              <span className="text-sm text-slate-200 capitalize">{catKey.replace(/([A-Z])/g, ' $1')}</span>
              <input
                type="checkbox"
                checked={!!currentCategories[catKey]}
                onChange={() => handleToggle(null, true, catKey)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}