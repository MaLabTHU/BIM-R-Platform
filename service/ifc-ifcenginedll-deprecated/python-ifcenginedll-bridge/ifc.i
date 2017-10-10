%module ifc
%{
#include "interface.h"
%}

#if defined(SWIGWORDSIZE64)
typedef long int		int64_t;
#else
typedef long long int	int64_t;
#endif

#if defined(WIN64)
typedef int64_t			intptr_t;
#else
typedef int				intptr_t;
#endif

%include <python/cwstring.i>
%apply wchar_t* {WCHAR *}

%include "interface.h"
