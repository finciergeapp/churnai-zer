import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Clock, CheckCircle } from "lucide-react";
import { SimpleCSVUploader } from "@/components/dashboard/SimpleCSVUploader";
import UploadHistorySection from "@/components/dashboard/UploadHistorySection";
import { ApiTestComponent } from "@/components/dashboard/ApiTestComponent";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CSVUploadPage = () => {
  const { user } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Fetch upload statistics
  const { data: uploadStats } = useQuery({
    queryKey: ['upload-stats', user?.id],
    queryFn: async () => {
      const { data: uploads, error } = await supabase
        .from('csv_uploads')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;

      const totalUploads = uploads?.length || 0;
      const totalProcessed = uploads?.reduce((sum, upload) => sum + (upload.rows_processed || 0), 0) || 0;
      const successfulUploads = uploads?.filter(upload => upload.status === 'completed').length || 0;

      return { totalUploads, totalProcessed, successfulUploads };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-foreground">📂 CSV Upload & Analysis</h1>
        <p className="text-muted-foreground">Import and analyze your customer data</p>
      </div>

      {/* Upload Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStats?.totalUploads || 0}</div>
            <p className="text-xs text-muted-foreground">CSV files processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Processed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStats?.totalProcessed || 0}</div>
            <p className="text-xs text-muted-foreground">Customer records analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uploadStats?.totalUploads ? 
                Math.round((uploadStats.successfulUploads / uploadStats.totalUploads) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Uploads completed successfully</p>
          </CardContent>
        </Card>
      </div>

      {/* Simple CSV Uploader */}
      <SimpleCSVUploader onUploadComplete={() => {
        // Refresh page to update stats
        window.location.reload();
      }} />

      {/* Upload History */}
      <UploadHistorySection />
    </div>
  );
};