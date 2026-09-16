import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { screeningApi } from "@/services/api/screeningApi";
import { ScreeningResult } from "./ScreeningResult";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export function ScreeningDetail() {
  const { id } = useParams();
  const [screening, setScreening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await screeningApi.getScreening(id);
        if (isMounted) {
          if (res.success && res.data) {
            setScreening(res.data);
          } else {
            setError(res.error?.message || "Screening record could not be found.");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load screening record.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">Retrieving screening record from database...</p>
      </div>
    );
  }

  if (error || !screening) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Record Not Found</h2>
        <p className="text-sm text-slate-500">{error || `No screening matched ID ${id}`}</p>
        <div className="pt-2">
          <Button variant="outline" asChild>
            <Link to="/screenings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Screening History
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
          <Link to="/screenings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Screening History
          </Link>
        </Button>
      </div>
      <ScreeningResult resultData={screening} />
    </div>
  );
}
