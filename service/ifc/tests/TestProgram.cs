using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace ifc.tests {
    public class TestProgram {

        [Fact]
        void testParseArgs() {
            Program.ParseArgs(new string[] { });
            Program.ParseArgs(new string[] { "house.ifc" });
            Program.ParseArgs(new string[] { "house.ifc", "test" });
        }

        [Fact]
        void testConvertIfc() {
            Program.ConvertIfc("house.ifc", "house");
        }

    }
}
