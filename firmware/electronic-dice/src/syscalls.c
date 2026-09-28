#include <sys/stat.h>
#include <stdint.h>

// PlatformIO 某些 STM32 Arduino 工具链会要求这个空的系统调用。
// 本项目不使用 printf，所以直接报告“写入成功”即可。
int _write(int file, char *ptr, int len) {
  (void)file;
  (void)ptr;
  return len;
}

int _close(int file) { (void)file; return -1; }
int _fstat(int file, struct stat *st) { (void)file; st->st_mode = S_IFCHR; return 0; }
int _isatty(int file) { (void)file; return 1; }
int _lseek(int file, int ptr, int dir) { (void)file; (void)ptr; (void)dir; return 0; }
int _read(int file, char *ptr, int len) { (void)file; (void)ptr; (void)len; return 0; }
