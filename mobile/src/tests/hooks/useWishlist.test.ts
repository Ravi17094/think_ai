import { addToWishlist, getWishlistIds, removeFromWishlist, toggleWishlist, __resetWishlistForTests } from '@/features/wishlist/wishlistStore';

describe('wishlist store', () => {
  beforeEach(() => __resetWishlistForTests());
  it('adds, toggles, removes, and deduplicates saved course ids', () => {
    addToWishlist('course-1');
    addToWishlist('course-1');
    expect(getWishlistIds()).toEqual(['course-1']);
    toggleWishlist('course-2');
    expect(getWishlistIds()).toEqual(['course-2', 'course-1']);
    removeFromWishlist('course-1');
    expect(getWishlistIds()).toEqual(['course-2']);
  });
});
