package media

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/pkg/media"
)

type Handler struct {
	mediaSvc *media.Service
}

func NewHandler(mediaSvc *media.Service) *Handler {
	return &Handler{mediaSvc: mediaSvc}
}

// RegisterRoutes wires the media upload routes onto the given (protected) group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/media/upload", h.Upload)
}

// Upload godoc
// @Summary      Upload an image
// @Tags         Media
// @Accept       multipart/form-data
// @Produce      json
// @Param        file formData file true "Image file"
// @Success      201 {object} map[string]string
// @Failure      400 {object} map[string]string
// @Router       /media/upload [post]
func (h *Handler) Upload(c *gin.Context) {
	// 10MB limit
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "file size exceeds limit"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "failed to read file from request"})
		return
	}
	defer file.Close()

	secureURL, err := h.mediaSvc.UploadImage(c.Request.Context(), file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	// Return the Cloudinary URL so the mobile app can use it
	c.JSON(http.StatusCreated, gin.H{
		"url": secureURL,
	})
}
