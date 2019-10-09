#include<bits/stdc++.h>
using namespace std;
const unsigned char ARROW=0XE0;
const unsigned char LEFT=0X4B;
const unsigned char RIGHT=0X4D;
const unsigned char DOWN=0X50;
const unsigned char UP=0X48;
const unsigned char ESCAPE=033;
#if false
int kbhit() {
	return 0;
}
int getch() {
	return getchar();
}
void initKeyBoard() {} void closeKeyBoard() {} enum COLOR {COLOR_BLACK=0,COLOR_DARK_BLUE=1,COLOR_DARK_GREEN=2,COLOR_DARK_BG=3,COLOR_DARK_RED=4,COLOR_DARK_PURPLE=5,COLOR_DARK_YELLOW=6,COLOR_DARK_WHITE=7,COLOR_GRAY=8,COLOR_BLUE=9,COLOR_GREEN=10,COLOR_BG=11,COLOR_RED=12,COLOR_PURPLE=13,COLOR_YELLOW=14,COLOR_WHITE=15};
class Printer {
	public:
		string s;
		COLOR f1,f2;
		bool bu;
		bool b1;
		int cx,cy;
		int sz;
		Printer() {
			s="";
		} bool setColor(COLOR fore,COLOR back=COLOR_BLACK,bool underline=false) {
			f1=fore;
			f2=back;
			bu=underline;
			return false;
		} long unsigned int write(const std::string&str) {
			s+=str;
			return str.size();
		} void writeln() {
			write("\n");
		} bool fresh() {
			cout<<s<<endl;
			return true;
		} void setCursor(bool show,int size=20) {
			b1=show;
			sz=size;
		} void gotoxy(int x,int y) {
			cx=x;
			cy=y;
		} void clear() {
			s="";
		}
};
void wait(int tick) {
	while(tick-->0) {}
} void setTitle(char title[]) {
	char cmd[200]="";
	sprintf(cmd,"title %s",title);
	system(cmd);
}
const char GAME_VERSION[]="alpha 0.2.6";
const char TITLE_FORMAT[]="WoA %s (Round %d %s's turn)";
const char*const BRIDGE_EMPTY[16]= {"xx","^^","<<","/-","vv","||","\\-","|-",">>","-\\","--","TT","-/","-|","^_","++"};
const char*const BRIDGE_FULL[16]= {"xx","^^","<<","/=","vv","!!","\\=","|=",">>","=\\","==","TT","=/","=|","^=","++"};
const char LABEL_TITLE[]="Player Atom  ";
const char SPACE[]="  ";
const char*const GAME_END_FORMAT[2]= {"title WoA %s (Game ended. %s won.)","title WoA %s (Game ended. No player won.)"};
const char*const ATOMS_CHAR[21]= {SPACE,".1",".2",".3",".4",".5",".6",".7",".8",".9",".A",".B",".C",".D",".E",".F",".G",".H",".I",".J",".K"};
const char*const SPECIAL_CHARS[]= {"()","~ ","/\\","[]","<>"};
#elif defined(_WIN32)
/* Little_Ming */
#include<conio.h>
#include<windows.h>
void initKeyBoard() {} void closeKeyBoard() {} enum COLOR {COLOR_BLACK=0,COLOR_DARK_BLUE=1,COLOR_DARK_GREEN=2,COLOR_DARK_BG=3,COLOR_DARK_RED=4,COLOR_DARK_PURPLE=5,COLOR_DARK_YELLOW=6,COLOR_DARK_WHITE=7,COLOR_GRAY=8,COLOR_BLUE=9,COLOR_GREEN=10,COLOR_BG=11,COLOR_RED=12,COLOR_PURPLE=13,COLOR_YELLOW=14,COLOR_WHITE=15};
HANDLE h1=CreateConsoleScreenBuffer(GENERIC_READ|GENERIC_WRITE,FILE_SHARE_WRITE,NULL,CONSOLE_TEXTMODE_BUFFER,NULL);
HANDLE h2=CreateConsoleScreenBuffer(GENERIC_READ|GENERIC_WRITE,FILE_SHARE_WRITE,NULL,CONSOLE_TEXTMODE_BUFFER,NULL);
HANDLE*oh[2]= {&h1,&h2};
class Printer {
	public:
		static const int CONSOLE_H=25;
		static const int CONSOLE_W=80;
		static const int CONSOLE_SIZE=CONSOLE_H*CONSOLE_W;
		HANDLE h;
		SMALL_RECT ALL;
		COORD ZERO;
		COORD BR;
		Printer() {
			freopen("data.txt","w",stdout);
			h=CreateConsoleScreenBuffer(GENERIC_READ|GENERIC_WRITE,FILE_SHARE_WRITE,NULL,CONSOLE_TEXTMODE_BUFFER,NULL);
			ALL.Top=ALL.Left=ZERO.X=ZERO.Y=0;
			ALL.Bottom=BR.Y=CONSOLE_H;
			ALL.Right=BR.X=CONSOLE_W;
		} bool setColor(COLOR fore,COLOR back=COLOR_BLACK,bool underline=false) {
			return SetConsoleTextAttribute(h,fore|(back<<4)|(underline?COMMON_LVB_UNDERSCORE:0));
		} long unsigned int write(const std::string&str) {
			long unsigned int res;
			const char*s=str.c_str();
			WriteConsole(h,s,strlen(s),&res,NULL);
			return res;
		} void writeln() {
			write("\n");
		} bool fresh() {
			HANDLE&ph=*(oh[1]);
			CONSOLE_CURSOR_INFO CursorInfo;
			GetConsoleCursorInfo(h,&CursorInfo);
			SetConsoleCursorInfo(ph,&CursorInfo);
			CONSOLE_SCREEN_BUFFER_INFO bufInfo;
			GetConsoleScreenBufferInfo(h,&bufInfo);
			SetConsoleCursorPosition(ph,bufInfo.dwCursorPosition);
			SMALL_RECT all=ALL;
			CHAR_INFO buf[CONSOLE_SIZE];
			bool succ=ReadConsoleOutput(h,buf,BR,ZERO,&all);
			all=ALL;
			succ&=WriteConsoleOutput(ph,buf,BR,ZERO,&all);
			SetConsoleActiveScreenBuffer(ph);
			std::swap(oh[0],oh[1]);
			return succ;
		} void setCursor(bool show,int size=20) {
			CONSOLE_CURSOR_INFO CursorInfo;
			GetConsoleCursorInfo(h,&CursorInfo);
			CursorInfo.dwSize=size;
			CursorInfo.bVisible=show;
			SetConsoleCursorInfo(h,&CursorInfo);
		} void gotoxy(int x,int y) {
			COORD pos;
			pos.X=x;
			pos.Y=y;
			SetConsoleCursorPosition(h,pos);
		} void clear() {
			DWORD cCharsWritten;
			CONSOLE_SCREEN_BUFFER_INFO csbi;
			DWORD dwConSize;
			HANDLE hConsole=h;
			GetConsoleScreenBufferInfo(hConsole,&csbi);
			dwConSize=csbi.dwSize.X*csbi.dwSize.Y;
			FillConsoleOutputCharacter(hConsole,TEXT(' '),dwConSize,ZERO,&cCharsWritten);
			GetConsoleScreenBufferInfo(hConsole,&csbi);
			FillConsoleOutputAttribute(hConsole,csbi.wAttributes,dwConSize,ZERO,&cCharsWritten);
			SetConsoleCursorPosition(hConsole,ZERO);
		}
};
void wait(int tick) {
	Sleep(tick*20);
}
void setTitle(char title[]) {
	char cmd[200]="";
	sprintf(cmd,"title %s",title);
	system(cmd);
}
const char GAME_VERSION[]="α0.2.6";
const char TITLE_FORMAT[]="原子战役%s (第%d回合 %s行动)";
const char*const BRIDGE_EMPTY[16]= {"×","↑","←","╔","↓","║","╚","╟","→","╗","═","╤","╝","╢","╧","╬"};
const char*const BRIDGE_FULL[16]= {"×","↑","←","┏","↓","┃","┗","┠","→","┓","━","┯","┛","┨","┷","╋"};
const char LABEL_TITLE[]="玩家   原子  ";
const char SPACE[]="　";
const char*const GAME_END_FORMAT[2]= {"title 原子战役%s (结束！%s赢了)","title 原子战役%s (结束！没有玩家胜利)"};
const char*const ATOMS_CHAR[21]= {SPACE,"·","‥","∴","∷","⑤","⑥","⑦","⑧","⑨","⑩","⑾","⑿","⒀","⒁","⒂","⒃","⒄","⒅","⒆","⒇"};
const char*const SPECIAL_CHARS[]= {"●","～","△","□","◆"};
#else
#include<termios.h>
#include<unistd.h>
#include<sys/prctl.h>
static struct termios initial_settings,new_settings;
static int peek_character=-1;
void initKeyBoard() {
	tcgetattr(0,&initial_settings);
	new_settings=initial_settings;
	new_settings.c_lflag&=~ICANON;
	new_settings.c_lflag&=~ECHO;
	new_settings.c_lflag&=~ISIG;
	new_settings.c_cc[VMIN]=1;
	new_settings.c_cc[VTIME]=0;
	tcsetattr(0,TCSANOW,&new_settings);
}
void closeKeyBoard() {
	tcsetattr(0,TCSANOW,&initial_settings);
	printf("\33[0m");
}
int kbhit() {
	char ch;
	int nread;
	if(peek_character!=-1)return 1;
	new_settings.c_cc[VMIN]=0;
	tcsetattr(0,TCSANOW,&new_settings);
	nread=read(0,&ch,1);
	new_settings.c_cc[VMIN]=1;
	tcsetattr(0,TCSANOW,&new_settings);
	if(nread==1) {
		peek_character=ch;
		return 1;
	}
	return 0;
}
int getch() {
	char ch;
	if(peek_character!=-1) {
		ch=peek_character;
		peek_character=-1;
		return ch;
	}
	read(0,&ch,1);
	if(ch=='\003') {
		closeKeyBoard();
		exit(0);
	}
	if(ch=='\033') {
		getch();
		char c=getch();
		const int res[]= {UP,DOWN,RIGHT,LEFT};
		return ARROW*256+res[c-'A'];
	}
	return ch;
}
enum COLOR {COLOR_BLACK=0,COLOR_DARK_BLUE=024,COLOR_DARK_GREEN=022,COLOR_DARK_BG=026,COLOR_DARK_RED=021,COLOR_DARK_PURPLE=025,COLOR_DARK_YELLOW=023,COLOR_DARK_WHITE=027,COLOR_GRAY=010,COLOR_BLUE=004,COLOR_GREEN=002,COLOR_BG=006,COLOR_RED=001,COLOR_PURPLE=005,COLOR_YELLOW=003,COLOR_WHITE=007};
class Printer {
	public:
		static const int CONSOLE_H=25;
		static const int CONSOLE_W=40;
		static const int CONSOLE_SIZE=CONSOLE_H*CONSOLE_W;
		int cursor_x,cursor_y;
		int cols,rows;
		bool cursor_show;
		std::string buf[CONSOLE_H][CONSOLE_W];
		std::string ctrl[CONSOLE_H][CONSOLE_W];
		Printer() {
			clear();
			cursor_x=cursor_y=-1;
			cursor_show=true;
			printf("\033[?25l");
		} bool setColor(COLOR fore,COLOR back=COLOR_BLACK,bool underline=false) {
			char tctrl[200];
			int fc=(fore&7)+(fore&020?30:90);
			int bc=(back&7)+(back&020?40:100);
			sprintf(tctrl,"\033[0m\033[%d;%d",fc,bc);
			ctrl[rows][cols]=tctrl;
			if(underline)ctrl[rows][cols]+=";4";
			ctrl[rows][cols]+="m";
			return true;
		} void write(const std::string&str) {
			buf[rows][cols++]=str;
		} void writeln() {
			rows++;
			cols=0;
		} void fresh() {
			std::string res="\033[2J";
			for(int i=0; i<CONSOLE_H; i++) {
				for(int j=0; j<CONSOLE_W; j++) {
					res+=ctrl[i][j];
					if(cursor_show&&i==cursor_y&&j==cursor_x/2) {
						res+="\033[5m\033[7m";
					}
					if(buf[i][j]=="")break;
					res+=buf[i][j];
				}
				res+="\033[0m\r\n";
				printf("%s",res.c_str());
			}
		} void setCursor(bool show,int size=20) {
			cursor_show=show;
			assert(size==size);
		} void gotoxy(int x,int y) {
			cursor_x=x;
			cursor_y=y;
		} void clear() {
			for(int i=0; i<CONSOLE_H; i++)for(int j=0; j<CONSOLE_W; j++) {
					buf[i][j].clear();
					ctrl[i][j].clear();
				}
			cols=rows=0;
		}
};
void wait(int tick) {
	usleep(tick*20000);
}
void setTitle(char title[]) {
	prctl(PR_SET_NAME,title,NULL,NULL,NULL);
}
const char GAME_VERSION[]="α0.2.6";
const char TITLE_FORMAT[]="原子战役%s (第%d回合 %s行动)";
const char*const BRIDGE_EMPTY[16]= {"× ","↑ ","← ","╔═","↓ ","║ ","╚═","╟═","→ ","╗ ","══","╤═","╝ ","╢ ","╧═","╬═"};
const char*const BRIDGE_FULL[16]= {"× ","↑ ","←━","┏━","↓ ","┃ ","┗━","┠━","━→","┓ ","━━","┯━","┛ ","┨ ","┷━","╋━"};
const char LABEL_TITLE[]="玩家   原子  ";
const char SPACE[]="　";
const char*const GAME_END_FORMAT[2]= {"title 原子战役%s (结束！%s赢了)","title 原子战役%s (结束！没有玩家胜利)"};
const char*const ATOMS_CHAR[21]= {SPACE,"· ","··",":.","::","*5","*6","*7","*8","*9","10","11","12","13","14","15","16","17","18","19","20"};
const char*const SPECIAL_CHARS[]= {"●","～","△ ","□ ","◆ "};
#endif
enum TERRAIN {TERRAIN_EMPTY,TERRAIN_SEA,TERRAIN_MOUNTAIN};
enum BUILDING {BUILDING_NONE,BUILDING_BRIDGE,BUILDING_PALACE,BUILDING_TOWER};
enum EVENT_TYPE {EVENT_UPDATE,EVENT_CAPETURE,EVENT_GAMEOVER};
enum PLAYER_TYPE {PLAYER_UNKNOWN,PLAYER_AI,PLAYER_HUMAN};
enum MAP_STYLE_TYPE {MAP_STYLE_DEBUG,MAP_STYLE_ARENA,MAP_STYLE_RIVER,MAP_STYLE_HILL,MAP_STYLE_ISLAND,MAP_STYLE_RING};
const int MAP_SIZE=25;
const int SCREEN_SIZE=12;
const double persistence=0.50;
const int Number_Of_Octaves=4;
const int MAX_PLAYERS=8;
const COLOR playerColors[MAX_PLAYERS]= {COLOR_RED,COLOR_BLUE,COLOR_GREEN,COLOR_DARK_PURPLE,COLOR_DARK_YELLOW,COLOR_DARK_GREEN,COLOR_DARK_RED,COLOR_BG};
const int dx[]= {-1,0,1,0};
const int dy[]= {0,-1,0,1};
const int LOG[16]= {-1,0,1,-1,2,-1,-1,-1,3,-1,-1,-1,-1,-1,-1,-1};
const bool BRIDGE_IS_CORNER[16]= {false,false,false,true,false,false,true,false,false,true,false,false,true,false,false,false};
const int SPEED_NONE=0;
const int SPEED_NOTICKDELAY=1;
const int SPEED_NOTICKPRINT=2;
const int SPEED_NOROUNDDELAY=4;
const int SPEED_NOROUNDPRINT=8;
double Noise(int x,int y) {
	int n=x+y*57;
	n=(n<<13)^n;
	return(1.0-((n*(n*n*15731+789221)+1376312589)&0x7fffffff)/1073741824.0);
}
double SmoothedNoise(int x,int y) {
	double corners=(Noise(x-1,y-1)+Noise(x+1,y-1)+Noise(x-1,y+1)+Noise(x+1,y+1))/16;
	double sides=(Noise(x-1,y)+Noise(x+1,y)+Noise(x,y-1)+Noise(x,y+1))/8;
	double center=Noise(x,y)/4;
	return corners+sides+center;
}
double Cosine_Interpolate(double a,double b,double x) {
	double ft=x*3.1415927;
	double f=(1-cos(ft))*0.5;
	return a*(1-f)+b*f;
}
double InterpolatedNoise(double x,double y) {
	int integer_X=int(x);
	double fractional_X=x-integer_X;
	int integer_Y=int(y);
	double fractional_Y=y-integer_Y;
	double v1=SmoothedNoise(integer_X,integer_Y);
	double v2=SmoothedNoise(integer_X+1,integer_Y);
	double v3=SmoothedNoise(integer_X,integer_Y+1);
	double v4=SmoothedNoise(integer_X+1,integer_Y+1);
	double i1=Cosine_Interpolate(v1,v2,fractional_X);
	double i2=Cosine_Interpolate(v3,v4,fractional_X);
	return Cosine_Interpolate(i1,i2,fractional_Y);
}
double PerlinNoise(double x,double y) {
	double total=0;
	double p=persistence;
	int n=Number_Of_Octaves;
	for(int i=0; i<n; i++) {
		double frequency=pow(2,i);
		double amplitude=pow(p,i);
		total=total+InterpolatedNoise(x*frequency,y*frequency)*amplitude;
	}
	return total;
}
double rand01() {
	return 1.0*rand()/RAND_MAX;
}
class Map;
class bigChar {
	public:
		std::string s;
		bigChar() {
			s="";
		} bigChar(const char*str) {
			s=std::string(str);
		} void cover(bigChar x) {
			if(x.s!="")s=x.s;
		}
};
struct Event {
	int x,y,t,data;
	EVENT_TYPE type;
	Event(int _x,int _y,int _t,EVENT_TYPE _type,int _data) {
		x=_x;
		y=_y;
		t=_t;
		type=_type;
		data=_data;
	} bool operator<(const Event e)const {
		if(t!=e.t)return t>e.t;
		if(x!=e.x)return x>e.x;
		if(y!=e.y)return y>e.y;
		return false;
	}
};
class Map {
	public:
		Printer*p;
		TERRAIN ter[MAP_SIZE][MAP_SIZE];
		BUILDING building[MAP_SIZE][MAP_SIZE];
		int data[MAP_SIZE][MAP_SIZE];
		int atoms[MAP_SIZE][MAP_SIZE];
		int atomFlags[MAP_SIZE][MAP_SIZE][4];
		int owner[MAP_SIZE][MAP_SIZE];
		bool alive[MAX_PLAYERS];
		int palacesx[MAX_PLAYERS];
		int palacesy[MAX_PLAYERS];
		vector<int>towersx,towersy;
		PLAYER_TYPE playerType[MAX_PLAYERS];
		const char*playerNames[MAX_PLAYERS];
		int atomsCount[MAX_PLAYERS];
		int landCount[MAX_PLAYERS];
		int size;
		int cx,cy;
		int speed;
		int playerCount;
		priority_queue<Event>eventQueue;
		int tick;
		Map(int _size) {
			size=_size;
			cx=cy=size/2;
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					building[x][y]=BUILDING_NONE;
					data[x][y]=0;
					atoms[x][y]=0;
					for(int der=0; der<4; der++)atomFlags[x][y][der]=0;
					owner[x][y]=-1;
				}
			}
			towersx.clear();
			towersy.clear();
			speed=0;
		} const bigChar getTerChars(int x,int y);
		const bigChar getBuildingChars(int x,int y);
		bool isUnderline(int x,int y);
		COLOR getForeColor(int x,int y);
		COLOR getBackColor(int x,int y);
		bool atomAccessable(int x,int y,int der);
		int atomLimit(int x,int y);
		bool hasEvent() {
			return!eventQueue.empty();
		} void doGameTick();
		void sendAtoms(int x,int y,int der,int tick,int owner,int count);
		void updateGrid(Event e);
		void setPalace(int x,int y,int id);
		void setTower(int x,int y,int id,int count,int speed);
		void setBridge(int x,int y,int n,int w,int s,int e);
		void towersProduce(int id);
		void buildMap(MAP_STYLE_TYPE style,int players);
		void gameCount() {
			memset(landCount,0,sizeof(landCount));
			memset(atomsCount,0,sizeof(atomsCount));
			for(int i=0; i<size; i++)for(int j=0; j<size; j++) {
					int to=owner[i][j];
					if(to>=0) {
						landCount[to]++;
						atomsCount[to]+=atoms[i][j];
					}
				}
		} void resetEvent() {
			tick=0;
			while(hasEvent())eventQueue.pop();
		} bool inBound(int x,int y) {
			return x>=0&&x<size&&y>=0&&y<size;
		} void print() {
			p->clear();
			gameCount();
			for(int i=-SCREEN_SIZE; i<=SCREEN_SIZE; i++) {
				for(int j=-SCREEN_SIZE; j<=SCREEN_SIZE; j++) {
					int x=cx+i;
					int y=cy+j;
					if(!inBound(x,y)) {
						p->setColor(COLOR_BLACK,COLOR_BLACK);
						p->write(SPACE);
						continue;
					}
					p->setColor(getForeColor(x,y),getBackColor(x,y),isUnderline(x,y));
					bigChar ch=getTerChars(x,y);
					ch.cover(getBuildingChars(x,y));
					p->write(ch.s);
				}
				int line=i+SCREEN_SIZE;
				if(line==0) {
					p->setColor(COLOR_BLACK,COLOR_WHITE);
					p->write(LABEL_TITLE);
				} else if(line-1>=0&&line-1<playerCount) {
					p->setColor(alive[line-1]?playerColors[line-1]:COLOR_BLACK,COLOR_WHITE);
					char rw[60]="";
					sprintf(rw,"%-6s %-6d",playerNames[line-1],atomsCount[line-1]);
					p->write(rw);
				}
				p->setColor(COLOR_BLACK,COLOR_BLACK);
				if(i<SCREEN_SIZE)p->writeln();
			}
			p->fresh();
		} bool moveCursor(int x,int y) {
			if(!inBound(x,y))return false;
			int hx=(y-cy+SCREEN_SIZE)*2;
			int hy=x-cx+SCREEN_SIZE;
			p->gotoxy(hx,hy);
			p->fresh();
			return true;
		} bool isEnded() {
			int ali=0;
			gameCount();
			for(int i=0; i<playerCount; i++)if(alive[i]||landCount[i]>0) {
					ali++;
				}
			if(ali<=1)return true;
			else return false;
		} int getWinner() {
			if(!isEnded())return-2;
			for(int i=0; i<playerCount; i++)if(alive[i]) {
					return i;
				}
			return-1;
		} void progress() {
			while(kbhit())getch();
			while(hasEvent()) {
				if((speed&SPEED_NOTICKDELAY)==0)wait(1);
				doGameTick();
				if((speed&SPEED_NOTICKPRINT)==0)print();
			}
			if((speed&SPEED_NOROUNDPRINT)==0)print();
			if((speed&SPEED_NOROUNDDELAY)==0)wait(3);
			if(isEnded()) {
				char cmd[200]="";
				int winner=getWinner();
				if(winner!=-1) {
					sprintf(cmd,GAME_END_FORMAT[0],GAME_VERSION,playerNames[winner]);
				} else {
					sprintf(cmd,GAME_END_FORMAT[1],GAME_VERSION);
				}
				system(cmd);
				print();
				closeKeyBoard();
				exit(0);
			}
		} bool choiceVaild(int x,int y,int id) {
			return inBound(x,y)&&owner[x][y]==id&&(building[x][y]==BUILDING_NONE||building[x][y]==BUILDING_PALACE);
		}
};
const bigChar Map::getTerChars(int x,int y) {
	switch(ter[x][y]) {
		case TERRAIN_EMPTY: {
			int k=atoms[x][y];
			if(k<=20)return bigChar(ATOMS_CHAR[k]);
			else return bigChar(SPECIAL_CHARS[0]);
			break;
		}
		case TERRAIN_SEA: {
			return bigChar((x+y)%2?SPACE:SPECIAL_CHARS[1]);
			break;
		}
		case TERRAIN_MOUNTAIN: {
			return bigChar(SPECIAL_CHARS[2]);
			break;
		}
	}
	return bigChar(SPACE);
}
const bigChar Map::getBuildingChars(int x,int y) {
	switch(building[x][y]) {
		case BUILDING_NONE: {
			return bigChar("");
			break;
		}
		case BUILDING_BRIDGE: {
			return bigChar((atoms[x][y]==0?BRIDGE_EMPTY:BRIDGE_FULL)[data[x][y]&15]);
			break;
		}
		case BUILDING_PALACE: {
			if(atoms[x][y]>0)return bigChar("");
			else return bigChar(SPECIAL_CHARS[3]);
			break;
		}
		case BUILDING_TOWER: {
			if(atoms[x][y]>0)return bigChar("");
			else return bigChar(SPECIAL_CHARS[4]);
			break;
		}
	}
	return bigChar(SPACE);
}
bool Map::isUnderline(int x,int y) {
	return building[x][y]==BUILDING_PALACE;
}
COLOR Map::getForeColor(int x,int y) {
	switch(building[x][y]) {
		case BUILDING_BRIDGE: {
			if(owner[x][y]==-1)if(ter[x][y]==TERRAIN_MOUNTAIN)return COLOR_BLACK;
				else return COLOR_GRAY;
			else return playerColors[owner[x][y]];
			break;
		}
		case BUILDING_PALACE: {
			return COLOR_YELLOW;
			break;
		}
		case BUILDING_TOWER: {
			return COLOR_PURPLE;
			break;
		}
		case BUILDING_NONE: {
			break;
		}
	}
	switch(ter[x][y]) {
		case TERRAIN_EMPTY: {
			return COLOR_WHITE;
			break;
		}
		case TERRAIN_MOUNTAIN: {
			return COLOR_BLACK;
			break;
		}
		case TERRAIN_SEA: {
			return COLOR_DARK_BG;
			break;
		}
	}
	return COLOR_BLACK;
}
COLOR Map::getBackColor(int x,int y) {
	switch(building[x][y]) {
		case BUILDING_PALACE:
		case BUILDING_TOWER: {
			if(owner[x][y]==-1)return COLOR_GRAY;
			else if(owner[x][y]==-2)return COLOR_BLACK;
			else return playerColors[owner[x][y]];
			return COLOR_WHITE;
			break;
		}
		case BUILDING_NONE: {
			break;
		}
		case BUILDING_BRIDGE: {
			if(ter[x][y]==TERRAIN_EMPTY)return COLOR_WHITE;
			break;
		}
	}
	switch(ter[x][y]) {
		case TERRAIN_EMPTY: {
			if(owner[x][y]==-1)return atoms[x][y]>0?COLOR_GRAY:COLOR_WHITE;
			else if(owner[x][y]==-2)return atoms[x][y]>0?COLOR_BLACK:COLOR_WHITE;
			else return playerColors[owner[x][y]];
			return COLOR_WHITE;
			break;
		}
		case TERRAIN_MOUNTAIN: {
			return COLOR_DARK_WHITE;
			break;
		}
		case TERRAIN_SEA: {
			return COLOR_DARK_BLUE;
			break;
		}
	}
	return COLOR_BLACK;
}
bool Map::atomAccessable(int x,int y,int der) {
	switch(building[x][y]) {
		case BUILDING_NONE: {
			break;
		}
		case BUILDING_BRIDGE: {
			return(data[x][y]&(1<<der))!=0?1:0;
		}
		case BUILDING_TOWER:
		case BUILDING_PALACE: {
			return true;
		}
	}
	switch(ter[x][y]) {
		case TERRAIN_SEA:
		case TERRAIN_EMPTY: {
			return true;
		}
		case TERRAIN_MOUNTAIN: {
			return false;
		}
	}
	return false;
}
int Map::atomLimit(int x,int y) {
	int res=0;
	for(int der=0; der<4; der++) {
		if(atomAccessable(x+dx[der],y+dy[der],der)) {
			res++;
		}
	}
	return res;
}
void Map::doGameTick() {
	while(hasEvent()&&(eventQueue.top().t<=tick||eventQueue.top().type==EVENT_GAMEOVER)) {
		Event e=eventQueue.top();
		eventQueue.pop();
		switch(e.type) {
			case EVENT_UPDATE: {
				updateGrid(e);
				break;
			}
			case EVENT_CAPETURE: {
				owner[e.x][e.y]=e.data;
				break;
			}
			case EVENT_GAMEOVER: {
				resetEvent();
				return;
			}
		}
	}
	tick++;
}
void Map::sendAtoms(int x,int y,int der,int tick,int aOwner,int count) {
	if(der!=-1)atomFlags[x][y][der]+=count;
	switch(building[x][y]) {
		case BUILDING_TOWER:
		case BUILDING_NONE: {
			break;
		}
		case BUILDING_BRIDGE: {
			goto ok;
			break;
		}
		case BUILDING_PALACE: {
			if(aOwner!=owner[x][y]&&owner[x][y]==data[x][y]) {
				alive[data[x][y]]=false;
				for(int i=0; i<size; i++)for(int j=0; j<size; j++) {
						if(owner[i][j]==data[x][y]) {
							eventQueue.push(Event(i,j,tick+(abs(i-x)+abs(j-y))*2,EVENT_CAPETURE,aOwner));
						}
					}
				building[x][y]=BUILDING_NONE;
				data[x][y]=0;
			}
			if(isEnded()) {
				eventQueue.push(Event(-1,-1,tick+256,EVENT_GAMEOVER,0));
			}
		}
	}
	switch(ter[x][y]) {
		case TERRAIN_EMPTY: {
			break;
		}
		case TERRAIN_MOUNTAIN:
		case TERRAIN_SEA: {
			return;
		}
	}
ok:
	;
	if(owner[x][y]!=-2) {
		owner[x][y]=aOwner;
		atoms[x][y]+=count;
	} else {
		if(count>atoms[x][y]) {
			owner[x][y]=aOwner;
			atoms[x][y]=count-atoms[x][y];
		} else {
			atoms[x][y]-=count;
		}
	}
	eventQueue.push(Event(x,y,tick+2,EVENT_UPDATE,0));
}
void Map::updateGrid(Event e) {
	int x=e.x;
	int y=e.y;
	switch(building[x][y]) {
		case BUILDING_PALACE:
		case BUILDING_TOWER:
		case BUILDING_NONE: {
			break;
		}
		case BUILDING_BRIDGE: {
			if(atoms[x][y]<=0)return;
			int d=data[x][y];
			for(int der=0; der<4; der++) {
				if(atomFlags[x][y][der]) {
					int newDer=der;
					if(BRIDGE_IS_CORNER[d])newDer=2^LOG[d^(1<<der)];
					atoms[x][y]-=atomFlags[x][y][der];
					sendAtoms(x+dx[newDer],y+dy[newDer],newDer,e.t+1,owner[x][y],atomFlags[x][y][der]);
				}
				atomFlags[x][y][der]=0;
			}
			return;
		}
	}
	switch(ter[x][y]) {
		case TERRAIN_EMPTY: {
			int oks=atomLimit(x,y);
			if(owner[x][y]!=-2&&oks>=1&&atoms[x][y]>=oks) {
				int splited=atoms[x][y]/oks;
				for(int der=0; der<4; der++) {
					if(atomAccessable(x+dx[der],y+dy[der],der)) {
						atoms[x][y]-=splited;
						sendAtoms(x+dx[der],y+dy[der],der,e.t+2,owner[x][y],splited);
					}
				}
			}
		}
		case TERRAIN_SEA:
		case TERRAIN_MOUNTAIN: {
			return;
		}
	}
}
void Map::towersProduce(int id) {
	int l=towersx.size();
	for(int i=0; i<l; i++) {
		int tx=towersx[i];
		int ty=towersy[i];
		if(building[tx][ty]==BUILDING_TOWER&&owner[tx][ty]==id)sendAtoms(tx,ty,-1,0,id,data[tx][ty]);
	}
}
void Map::setPalace(int x,int y,int id) {
	ter[x][y]=TERRAIN_EMPTY;
	owner[x][y]=id;
	building[x][y]=BUILDING_PALACE;
	data[x][y]=id;
	palacesx[id]=x;
	palacesy[id]=y;
}
void Map::setTower(int x,int y,int id,int count,int speed=1) {
	owner[x][y]=id;
	atoms[x][y]=count;
	building[x][y]=BUILDING_TOWER;
	data[x][y]=speed;
	towersx.push_back(x);
	towersy.push_back(y);
}
void Map::setBridge(int x,int y,int n,int w,int s,int e) {
	building[x][y]=BUILDING_BRIDGE;
	data[x][y]=(n<<0)|(w<<1)|(s<<2)|(e<<3);
}
void Map::buildMap(MAP_STYLE_TYPE style,int players) {
	towersx.clear();
	towersy.clear();
	playerCount=players;
	switch(style) {
		case MAP_STYLE_DEBUG: {
			int posesx[]= {2,2,size-3,size-3,2,size/2,size/2,size-3,size/2};
			int posesy[]= {2,size-3,2,size-3,size/2,2,size-3,size/2,size/2};
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					ter[x][y]=(x==0||x==size-1||y==0||y==size-1)?TERRAIN_MOUNTAIN:TERRAIN_EMPTY;
				}
			}
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					if(ter[x][y]==TERRAIN_EMPTY) {
						setTower(x,y,-2,rand()%3+1);
					}
				}
			}
			for(int id=0; id<players; id++) {
				setPalace(posesx[id],posesy[id],id);
				atoms[posesx[id]][posesy[id]]=0;
			}
			break;
		}
		case MAP_STYLE_ARENA: {
			int mx=rand();
			int my=rand();
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					if(min(min(x,y),min(size-1-x,size-1-y))+PerlinNoise(x+mx,y+my)<=1)ter[x][y]=TERRAIN_MOUNTAIN;
					else ter[x][y]=TERRAIN_EMPTY;
				}
			}
			for(int x=4; x<=size-5; x++) {
				building[x][size/2]=BUILDING_BRIDGE;
				data[x][size/2]|=((1<<0)|(1<<2));
			}
			for(int y=4; y<=size-5; y++) {
				building[size/2][y]=BUILDING_BRIDGE;
				data[size/2][y]|=((1<<1)|(1<<3));
			}
			for(int x=size/2-1; x<=size/2+1; x++) {
				for(int y=size/2-1; y<=size/2+1; y++) {
					building[x][y]=BUILDING_NONE;
					data[x][y]=0;
				}
			}
			setTower(size/2,size/2,-2,(players)/2-rand()%2);
			int c=(size-5)*4;
			int start=rand()%c;
			for(int id=0; id<players; id++) {
				int pos=(start+id*c/players)%c;
				int dpos=pos%(c/4);
				if(0<=pos&&pos<c/4)setPalace(2,dpos+2,id);
				if(c/4<=pos&&pos<c/2)setPalace(dpos+2,size-3,id);
				if(c/2<=pos&&pos<c/4*3)setPalace(size-3,size-3-dpos,id);
				if(c/4*3<=pos&&pos<c)setPalace(size-3-dpos,2,id);
			}
			break;
		}
		case MAP_STYLE_RIVER: {
			int mx=rand();
			int my=rand();
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					if(min(min(x,y),min(size-1-x,size-1-y))+PerlinNoise(x+mx,y+my)<=1)ter[x][y]=TERRAIN_MOUNTAIN;
					else ter[x][y]=TERRAIN_EMPTY;
				}
			}
			for(int y=0; y<size; y++) {
				for(int x=size/2-1; x<=size/2+1; x++)if(ter[x][y]==TERRAIN_EMPTY&&abs(size/2-x)+PerlinNoise(x+mx,y+my)<1.2) {
						ter[x][y]=TERRAIN_SEA;
					}
			}
			int mustBuild=rand()%(size-6)+3;
			int setWait=0;
			for(int y=3; y<=size-4; y++) {
				if(setWait<=0&&(y==mustBuild||rand()%4==0)) {
					for(int x=size/2-2; x<=size/2+2; x++) {
						building[x][y]=BUILDING_BRIDGE;
						data[x][y]|=((1<<0)|(1<<2));
					}
					setWait=3;
				}
				setWait--;
			}
			int c=(size-6)*2;
			int start=rand()%c;
			for(int id=0; id<players; id++) {
				int pos=(start+id*c/players)%c;
				int dpos=pos%(c/2);
				if(0<=pos&&pos<c/2)setPalace(3,dpos+3,id);
				if(c/2<=pos&&pos<c)setPalace(size-4,size-4-dpos,id);
			}
			break;
		}
		case MAP_STYLE_HILL: {
			int mx=rand();
			int my=rand();
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					if(min(min(x,y),min(size-1-x,size-1-y))+PerlinNoise(x+mx,y+my)<=2)ter[x][y]=TERRAIN_MOUNTAIN;
					else ter[x][y]=TERRAIN_EMPTY;
				}
			}
			for(int x=4; x<=size-5; x++) {
				for(int y=4; y<=size-5; y++) {
					if(PerlinNoise(x+mx,y+my)<=0) {
						ter[x][y]=TERRAIN_MOUNTAIN;
					}
				}
			}
			int tb=(size+1)*3/4;
			for(int i=0; i<tb; i++) {
				int bx=rand()%(size-10)+5;
				int by=rand()%(size-10)+5;
				int d[2];
				d[0]=i%4;
				d[1]=d[0]^2;
				for(int di=0; di<2; di++) {
					int nx=bx;
					int ny=by;
					while(inBound(nx,ny)&&ter[nx][ny]==TERRAIN_MOUNTAIN) {
						building[nx][ny]=BUILDING_BRIDGE;
						data[nx][ny]|=(1<<(d[0]))|(1<<(d[1]));
						nx+=dx[d[di]];
						ny+=dy[d[di]];
					}
				}
			}
			int c=(size-5)*4;
			int start=rand()%c;
			for(int id=0; id<players; id++) {
				int pos=(start+id*c/players)%c;
				int dpos=pos%(c/4);
				if(dpos%(size-5)==0)dpos++;
				dpos%=c;
				if(0<=pos&&pos<c/4)setPalace(2,dpos+2,id);
				if(c/4<=pos&&pos<c/2)setPalace(dpos+2,size-3,id);
				if(c/2<=pos&&pos<c/4*3)setPalace(size-3,size-3-dpos,id);
				if(c/4*3<=pos&&pos<c)setPalace(size-3-dpos,2,id);
			}
			break;
		}
		case MAP_STYLE_ISLAND: {
			int mx=rand();
			int my=rand();
			for(int x=0; x<size; x++) {
				for(int y=0; y<size; y++) {
					if(min(min(x,y),min(size-1-x,size-1-y))+PerlinNoise(x+mx,y+my)<=1)ter[x][y]=TERRAIN_SEA;
					else ter[x][y]=TERRAIN_EMPTY;
				}
			}
			setTower(size/2,size/2,-1,0,2);
			setBridge(size/2+1,size/2,0,0,1,0);
			setBridge(size/2-1,size/2,1,0,0,0);
			setBridge(size/2,size/2+1,0,0,0,1);
			setBridge(size/2,size/2-1,0,1,0,0);
			setTower(size/2-5,size/2-5,-2,4);
			setTower(size/2-5,size/2+5,-2,4);
			setTower(size/2+5,size/2-5,-2,4);
			setTower(size/2+5,size/2+5,-2,4);
			int c=(size-7)*4;
			int start=rand()%c;
			for(int id=0; id<players; id++) {
				int pos=(start+id*c/players)%c;
				int dpos=pos%(c/4);
				if(0<=pos&&pos<c/4)setPalace(3,dpos+3,id);
				if(c/4<=pos&&pos<c/2)setPalace(dpos+3,size-4,id);
				if(c/2<=pos&&pos<c/4*3)setPalace(size-4,size-4-dpos,id);
				if(c/4*3<=pos&&pos<c)setPalace(size-4-dpos,3,id);
			}
			break;
			break;
		}
		case MAP_STYLE_RING: {
			int mx=rand();
			int my=rand();
#define tryBridge(x,y,n,w,s,e,r) do{if(PerlinNoise(x+mx,y+my)<=r)setBridge(x,y,n,w,s,e);}while(0)
#define genRing(_x,_r) do{int x(_x);double r(_r);tryBridge(x,x,1,1,0,0,r);tryBridge(x,size-1-x,1,0,0,1,r);tryBridge(size-1-x,x,0,1,1,0,r);tryBridge(size-1-x,size-1-x,0,0,1,1,r);for(int i=x+1;i<size-1-x;i++){if(i==size/2&&r<1)continue;tryBridge(x,i,0,1,0,1,r);tryBridge(size-1-x,i,0,1,0,1,r);tryBridge(i,x,1,0,1,0,r);tryBridge(i,size-1-x,1,0,1,0,r);}}while(0)
			genRing(0,1);
			for(int i=5; i+2<=size/2; i+=5) {
				genRing(i,(double)i*0.5/size);
			}
			for(int i=size/2-1; i<=size/2+1; i++) {
				for(int j=size/2-1; j<=size/2+1; j++) {
					bool isE=i==size/2&&j==size/2;
					setTower(i,j,isE?-1:-2,isE?0:4);
				}
			}
			int c=(size-5)*4;
			int start=rand()%c;
			for(int id=0; id<players; id++) {
				int pos=(start+id*c/players)%c;
				int dpos=pos%(c/4);
				if(0<=pos&&pos<c/4)setPalace(2,dpos+2,id);
				if(c/4<=pos&&pos<c/2)setPalace(dpos+2,size-3,id);
				if(c/2<=pos&&pos<c/4*3)setPalace(size-3,size-3-dpos,id);
				if(c/4*3<=pos&&pos<c)setPalace(size-3-dpos,2,id);
			}
			break;
#undef genRing
		}
	}
	for(int i=0; i<players; i++) {
		alive[i]=true;
		playerType[i]=PLAYER_UNKNOWN;
	}
}
double dfs(Map*map,int id,int&x,int&y,bool help,int dep,double alpha,double beta) {
	if(dep<=0) {
		if(map->isEnded()) {
			return map->getWinner()==id?(1<<30):-(1<<30);
		}
		map->gameCount();
		double score=0;
		for(int i=0; i<map->playerCount; i++) {
			int s=i==id?1:-1;
			score+=s*(1.0*map->atomsCount[i]+1.0*map->landCount[i]);
			if(map->alive[i]) {
				for(int dx=-3; dx<=3; dx++) {
					int ry=3-abs(dx);
					for(int dy=-ry; dy<=ry; dy++) {
						int tx=map->palacesx[i]+dx;
						int ty=map->palacesy[i]+dy;
						if(map->inBound(tx,ty)) {
							int o=map->owner[tx][ty];
							if(o>=0) {
								score+=(o==id?1e4:-1e4)/(abs(dx)+abs(dy)+1);
							}
						}
					}
				}
			}
		}
		return score;
	}
	x=-1;
	y=-1;
	double score;
	double score1d=-(1<<30);
	double rnd=1.0;
	if(help)score=-(1<<30);
	else score=(1<<30);
	for(int i=0; i<map->size; i++)for(int j=0; j<map->size; j++) {
			bool ok=false;
			if(help)ok=map->choiceVaild(i,j,id);
			else {
				for(int tid=0; tid<MAX_PLAYERS; tid++) {
					if(tid!=id&&map->choiceVaild(i,j,tid))ok=true;
				}
			}
			if(!ok)continue;
			int pl=map->owner[i][j];
			Map tmap(*map);
			if(!help) {
				int npl=(id+1)%tmap.playerCount;
				while(npl!=pl) {
					if(npl==0) {
						tmap.resetEvent();
						tmap.towersProduce(-1);
						while(tmap.hasEvent())tmap.doGameTick();
					}
					tmap.resetEvent();
					tmap.towersProduce(npl);
					while(tmap.hasEvent())tmap.doGameTick();
					npl=(npl+1)%tmap.playerCount;
				}
			}
			tmap.resetEvent();
			tmap.towersProduce(pl);
			while(tmap.hasEvent())tmap.doGameTick();
			tmap.resetEvent();
			tmap.sendAtoms(i,j,-1,0,pl,1);
			while(tmap.hasEvent())tmap.doGameTick();
			if(!help) {
				int npl=(pl+1)%tmap.playerCount;
				while(npl!=id) {
					if(npl==0) {
						tmap.resetEvent();
						tmap.towersProduce(-1);
						while(tmap.hasEvent())tmap.doGameTick();
					}
					tmap.resetEvent();
					tmap.towersProduce(npl);
					while(tmap.hasEvent())tmap.doGameTick();
					npl=(npl+1)%tmap.playerCount;
				}
			}
			tmap.resetEvent();
			tmap.towersProduce(id);
			while(tmap.hasEvent())tmap.doGameTick();
			int tx,ty;
			double newScore=dfs(&tmap,id,tx,ty,!help,dep-1,alpha,beta);
			double new1d;
			double trnd=rand01();
			bool cha=false;
			if(help) {
				cha=newScore>score;
				if(newScore==score) {
					Map dmap(*map);
					int less=dmap.atomLimit(i,j)-dmap.atoms[i][j];
					dmap.resetEvent();
					dmap.sendAtoms(i,j,-1,0,id,less);
					while(dmap.hasEvent())dmap.doGameTick();
					int tx,ty;
					new1d=(dfs(&dmap,id,tx,ty,true,0,alpha,beta)-dfs(map,id,tx,ty,true,0,alpha,beta))/less;
					if(new1d>score1d)cha=true;
					else if(new1d==score1d) {
						cha=trnd>rnd;
					}
				}
			} else cha=newScore<score||(newScore==score&&trnd>rnd);
			if(cha) {
				x=i;
				y=j;
				score=newScore;
				if(help)score1d=new1d;
				rnd=trnd;
			}
			if(help) {
				if(score>alpha) {
					alpha=score;
					if(alpha>=beta)goto end;
				}
			} else {
				if(score<beta) {
					beta=score;
					if(beta<=alpha)goto end;
				}
			}
		}
end:
	;
	return score;
}
double AILV[MAX_PLAYERS];
void AI(Map*map,int id,int&x,int&y) {
	bool mistake=rand01()>AILV[id];
	dfs(map,id,x,y,true,mistake?1:2,-(1<<30),(1<<30));
}
int cursorx[MAX_PLAYERS];
int cursory[MAX_PLAYERS];
void decide(Map*map,int id,int&x,int&y) {
	switch(map->playerType[id]) {
		case PLAYER_UNKNOWN: {
			break;
		}
		case PLAYER_AI: {
			AI(map,id,x,y);
			break;
		}
		case PLAYER_HUMAN: {
			int ux=cursorx[id];
			int uy=cursory[id];
			map->p->setCursor(true,100);
			map->moveCursor(ux,uy);
			while(kbhit())getch();
			while(true) {
				int key=getch();
				if(key==ARROW)key=key*256+getch();
				int tx=ux,ty=uy;
				switch(key) {
					case ESCAPE: {
						closeKeyBoard();
						exit(0);
						break;
					}
					case'P':
					case'p': {
						x=y=-1;
						map->p->setCursor(false);
						return;
					}
					case' ':
					case'\n': {
						x=ux;
						y=uy;
						map->p->setCursor(false);
						cursorx[id]=x;
						cursory[id]=y;
						return;
					}
					case 256*ARROW+UP:
					case'W':
					case'w': {
						tx--;
						break;
					}
					case 256*ARROW+LEFT:
					case'A':
					case'a': {
						ty--;
						break;
					}
					case 256*ARROW+DOWN:
					case'S':
					case's': {
						tx++;
						break;
					}
					case 256*ARROW+RIGHT:
					case'D':
					case'd': {
						ty++;
						break;
					}
					case'R':
					case'r': {
						tx=map->palacesx[id];
						ty=map->palacesy[id];
						break;
					}
					case'G':
					case'g': {
						map->alive[id]=false;
						map->p->setCursor(false);
						cursorx[id]=-1;
						cursory[id]=-1;
						return;
					}
				}
				if((tx!=ux||ty!=uy)&&map->inBound(tx,ty)) {
					ux=tx;
					uy=ty;
					map->moveCursor(ux,uy);
				}
			}
			map->p->setCursor(false);
			break;
		}
	}
}
char title[200];
int main() {
	initKeyBoard();
	sprintf(title,"原子战役%s (加载中……)",GAME_VERSION);
	setTitle(title);
	Printer p;
	Map map(25);
	map.p=&p;
	int PLAYERS=8;
	int HUMAN_PLAYERS=1;
	srand(time(NULL));
	const int MAPS=5;
	MAP_STYLE_TYPE Maps[MAPS]= {MAP_STYLE_ARENA,MAP_STYLE_RIVER,MAP_STYLE_HILL,MAP_STYLE_ISLAND,MAP_STYLE_RING};
	map.buildMap(Maps[rand()%MAPS],PLAYERS);
	map.p->setCursor(false);
	for(int i=0; i<PLAYERS; i++) {
		map.playerType[i]=i<HUMAN_PLAYERS?PLAYER_HUMAN:PLAYER_AI;
	}
	map.speed=SPEED_NONE;
	for(int i=0; i<PLAYERS; i++) {
		if(map.playerType[i]==PLAYER_HUMAN) {
			cursorx[i]=map.palacesx[i];
			cursory[i]=map.palacesy[i];
			map.playerNames[i]=" 人类 ";
		} else {
			const double AILVS[]= {0.0,0.3,0.3,0.5,0.5,0.5,0.9,0.9,0.9,0.95,0.95,1.0};
			AILV[i]=AILVS[rand()%(sizeof(AILVS)/sizeof(double))];
			const char*name;
			if(AILV[i]<=0.050)name="菜鸡AI";
			else if(AILV[i]<=0.400)name="蒟蒻AI";
			else if(AILV[i]<=0.600)name="萌新AI";
			else if(AILV[i]<=0.900)name="普通AI";
			else if(AILV[i]<=0.950)name="高手AI";
			else if(AILV[i]<=1.000)name="精英AI";
			else name="神-ZRQ";
			map.playerNames[i]=name;
		}
	}
	for(int i=1;; i++) {
		map.resetEvent();
		map.towersProduce(-1);
		map.progress();
		for(int j=0; j<PLAYERS; j++) {
			if(map.alive[j]) {
				if(!(map.speed&SPEED_NOROUNDPRINT)) {
					sprintf(title,TITLE_FORMAT,GAME_VERSION,i,map.playerNames[j]);
					setTitle(title);
				}
				map.resetEvent();
				map.towersProduce(j);
				map.progress();
				int x,y;
				if(!(map.speed&SPEED_NOROUNDPRINT))map.print();
				decide(&map,j,x,y);
				map.resetEvent();
				if(map.choiceVaild(x,y,j))map.sendAtoms(x,y,-1,0,j,1);
				map.progress();
			}
		}
	}
	closeKeyBoard();
	return 0;
}