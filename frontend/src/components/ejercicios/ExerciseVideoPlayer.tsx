interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
}

export function ExerciseVideoPlayer({ videoUrl, thumbnailUrl, title }: Props) {
  return (
    <div className="protected-content relative aspect-video w-full overflow-hidden rounded-xl bg-black select-none">
      <video
        src={videoUrl}
        poster={thumbnailUrl}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full object-contain"
        aria-label={`Video explicativo: ${title}`}
      />
    </div>
  );
}
