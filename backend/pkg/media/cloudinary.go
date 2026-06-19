package media

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type Service struct {
	cld *cloudinary.Cloudinary
}

func NewService(cloudinaryURL string) (*Service, error) {
	// Parse the CLOUDINARY_URL format: cloudinary://<api_key>:<api_secret>@<cloud_name>
	cld, err := cloudinary.NewFromURL(cloudinaryURL)
	if err != nil {
		return nil, fmt.Errorf("failed to init cloudinary: %w", err)
	}

	return &Service{cld: cld}, nil
}

// UploadImage takes a multipart file from the HTTP request, uploads it to Cloudinary,
// and returns the secure URL of the uploaded image.
func (s *Service) UploadImage(ctx context.Context, file multipart.File) (string, error) {
	resp, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder: "campusconnect", // groups images into a folder in your Cloudinary dashboard
	})
	if err != nil {
		return "", fmt.Errorf("cloudinary upload failed: %w", err)
	}

	return resp.SecureURL, nil
}
