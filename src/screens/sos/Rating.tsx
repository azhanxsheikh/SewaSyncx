import { useState } from 'react';
import type { Screen } from '../../data/mockData';
import { technicians } from '../../data/mockData';

interface Props {
  navigate: (s: Screen) => void;
}

const tags = ['Professional', 'Fast', 'Polite', 'Skilled', 'Transparent pricing', 'Clean work', 'On time', 'Well equipped'];

export default function Rating({ navigate }: Props) {
  const tech = technicians[0];
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (t: string) => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => navigate('home'), 2500);
  };

  const displayRating = hoverRating || rating;

  const ratingLabels: Record<number, string> = {
    1: 'Poor', 2: 'Below average', 3: 'Good', 4: 'Very good', 5: 'Excellent!',
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display font-800 text-2xl text-gray-900 mb-2">Thank you!</h2>
        <p className="text-gray-500 text-sm">Your review helps other customers choose verified professionals.</p>
        <p className="text-gray-400 text-xs mt-2">Redirecting to home...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-500 text-sm">Service completed</p>
          <h2 className="font-display font-800 text-xl text-gray-900 mt-0.5">How was your experience?</h2>
        </div>
      </div>

      <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full">
        {/* Technician */}
        <div className="flex flex-col items-center mb-8">
          <img src={tech.photo} alt={tech.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100 mb-3" />
          <p className="font-display font-700 text-gray-900 text-lg">{tech.name}</p>
          <p className="text-sm text-gray-500">Electrician · Electrical Repair</p>
        </div>

        {/* Star rating */}
        <div className="text-center mb-6">
          <div className="flex justify-center gap-3 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="text-4xl transition-transform hover:scale-110 active:scale-95"
              >
                <span className={displayRating >= star ? 'text-amber-400' : 'text-gray-200'}>★</span>
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <p className="text-gray-600 font-600 text-sm fade-in">{ratingLabels[displayRating]}</p>
          )}
        </div>

        {/* Tags */}
        {rating > 0 && (
          <div className="mb-6 fade-in">
            <p className="font-display font-700 text-gray-900 text-sm mb-3">What did you like?</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-2 rounded-xl text-sm font-500 border transition-all ${
                    selectedTags.includes(t)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text review */}
        {rating > 0 && (
          <div className="mb-6 fade-in">
            <p className="font-display font-700 text-gray-900 text-sm mb-2">Write a review <span className="text-gray-400 font-400">(optional)</span></p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              placeholder="Share your experience with other customers..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none"
            />
          </div>
        )}

        {/* Tip */}
        {rating >= 4 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 fade-in">
            <p className="font-600 text-amber-800 text-sm mb-2">Leave a tip for Rahul? 🙏</p>
            <div className="flex gap-2">
              {['₹20', '₹50', '₹100', 'Custom'].map((tip) => (
                <button
                  key={tip}
                  className="flex-1 py-2 bg-white border border-amber-200 rounded-lg text-xs font-600 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  {tip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto space-y-2">
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className={`w-full py-4 rounded-xl font-display font-700 text-base transition-all active:scale-[0.98] ${
              rating > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit Review
          </button>
          <button onClick={() => navigate('home')} className="w-full text-gray-400 text-sm py-2">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
